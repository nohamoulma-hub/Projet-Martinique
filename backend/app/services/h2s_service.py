# Odeurs des sargasses : concentrations d'hydrogène sulfuré (H2S) relevées par Madininair,
# l'observatoire de la qualité de l'air en Martinique. API publique, sans clé, sous licence
# ouverte Etalab 2.0 : la source « Madininair » doit être citée.
from datetime import datetime, timedelta, timezone

import httpx

from app.services import cache_service, coastline

BULLETIN_URL = "https://api-madininair.fr/api/mesures_sargasses/bulletin/public"
SOURCE = "Madininair"
SOURCE_URL = "https://www.madininair.fr/surveillance-continue-sargasses"

# Position des capteurs (l'API ne la fournit pas), relevée sur la carte publique de Madininair
STATIONS = {
    2: (14.75521, -60.96797), 6: (14.67056, -60.94316), 7: (14.66051, -60.93476),
    8: (14.61847, -60.88716), 9: (14.60824, -60.87552), 12: (14.55275, -60.83727),
    16: (14.66018, -60.89957), 18: (14.66314, -60.91046), 19: (14.70328, -60.91528),
    22: (14.69901, -60.90338), 26: (14.64345, -60.89881), 27: (14.54257, -60.83021),
    29: (14.82375, -61.03245), 30: (14.46934, -61.04592), 31: (14.44241, -60.82536),
    40: (14.64855, -60.90427), 42: (14.68448, -60.92950), 46: (14.60241, -60.86914),
    47: (14.59937, -60.87305), 92: (14.53792, -60.82786), 94: (14.72510, -60.94587),
}

# Seuils et recommandations officiels de Madininair et de l'ARS, cités tels quels
THRESHOLDS = [
    {"id": "tres-faible", "label": "Très faible", "min": 0, "max": 0.03, "color": "#009933",
     "message": "Le H₂S n'a pas été mis en évidence avec les moyens de mesure."},
    {"id": "faible", "label": "Faible", "min": 0.03, "max": 0.07, "color": "#9dcb44",
     "message": "Les niveaux de H₂S relevés peuvent entraîner des gênes olfactives mais il n'est "
                "pas attendu d'effet sanitaire."},
    {"id": "moyen", "label": "Moyen", "min": 0.07, "max": 1, "color": "#ffff00",
     "message": "Les niveaux de H₂S relevés peuvent entraîner des gênes respiratoires chez les "
                "personnes sensibles et vulnérables. Dès la perception d'odeurs, les personnes "
                "vulnérables sont invitées à se tenir éloignées des zones de décomposition des "
                "algues et à éviter d'être sous le vent des émissions des gaz."},
    {"id": "eleve", "label": "Élevé", "min": 1, "max": 5, "color": "#ff9933",
     "message": "L'apparition de symptômes type maux de tête, irritations oculaires, irritations "
                "de la gorge est probable dans la population générale. La population est invitée "
                "à se tenir éloignée des zones de décomposition des algues."},
    {"id": "tres-eleve", "label": "Très élevé", "min": 5, "max": None, "color": "#e8312a",
     "message": "Il est conseillé à l'ensemble de la population de se tenir éloignée des zones à "
                "risque et de ne pas se placer sous le vent des émissions de gaz. Adressez-vous à "
                "votre médecin ou à votre pharmacien en cas de symptômes."},
]

USER_AGENT = {"User-Agent": "ProjetMartinique/1.0 (site touristique, projet etudiant)"}


def threshold_for(value: float) -> dict:
    """Seuil officiel correspondant à une concentration en ppm."""
    for threshold in THRESHOLDS:
        if threshold["max"] is None or value < threshold["max"]:
            return threshold
    return THRESHOLDS[-1]


def to_ppm(raw) -> tuple[float, bool] | None:
    """Concentration en ppm et indicateur « sous le seuil de détection » (valeur « <0.03 »)."""
    if raw is None or raw == "":
        return None
    if isinstance(raw, str) and raw.strip().startswith("<"):
        return 0.0, True
    try:
        return float(raw), False
    except (TypeError, ValueError):
        return None


def parse_bulletin(rows: list[dict]) -> dict:
    """Capteurs du bulletin du jour, avec position, niveau et façade de côte."""
    sensors = []
    for row in rows:
        parsed = to_ppm(row.get("valeur", row.get("moy24h")))
        if parsed is None:
            continue  # capteur en panne ce jour-là
        value, below_detection = parsed
        site_id = int(row["id_site"])
        commune = row.get("nom_com") or ""
        latitude, longitude = STATIONS.get(site_id, (None, None))
        level = threshold_for(value)
        sensors.append({
            "id": site_id,
            "name": row["site"].split(" - ")[0],
            "commune": commune,
            "network": row.get("reseau"),
            "value_ppm": value,
            "below_detection": below_detection,
            "level": level["id"],
            "latitude": latitude,
            "longitude": longitude,
            "zone": coastline.ZONES[coastline.nearest_zone(latitude, longitude)]["id"] if latitude else None,
        })
    sensors.sort(key=lambda s: s["value_ppm"], reverse=True)
    dates = sorted({row["date"] for row in rows if row.get("date")})
    return {"date": dates[-1] if dates else None, "sensors": sensors}


def refresh_h2s() -> dict:
    """Relève le dernier bulletin H2S (publié chaque jour vers 12 h). Appelé toutes les heures."""
    # Sans date, l'API renvoie parfois l'avant-veille : on demande les derniers jours un à un
    # Date de la Martinique (UTC-4), celle des bulletins de Madininair
    today = datetime.now(timezone(timedelta(hours=-4))).date()
    rows = []
    with httpx.Client(headers=USER_AGENT, timeout=30) as client:
        for back in range(0, 4):
            day = (today - timedelta(days=back)).isoformat()
            response = client.get(BULLETIN_URL, params={"polluant": "H2S", "date_jour": day})
            response.raise_for_status()
            rows = response.json()
            if rows:
                break
    bulletin = parse_bulletin(rows)
    data = {
        "updated_at": datetime.now(timezone.utc).isoformat(timespec="minutes"),
        **bulletin,
        "unit": "ppm",
        "thresholds": THRESHOLDS,
        "source": SOURCE,
        "source_url": SOURCE_URL,
    }
    cache_service.write_json("sargasses/h2s.json", data)
    return data
