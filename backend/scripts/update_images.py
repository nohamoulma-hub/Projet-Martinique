"""
Met à jour les image_url des activités déjà en base.
Lancer depuis le dossier backend/ avec : python scripts/update_images.py
"""
import sys
import os

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.core.database import SessionLocal
from app.models.point_of_interest import PointOfInterest

# Photo de couverture de chaque activité.
# Deux sources, toutes servies en local (/assets/...) : photos personnelles, et copies
# de photos Wikimedia Commons (licence libre, crédits dans CREDITS_PHOTOS.md) pour les
# lieux non encore photographiés.
IMAGES = {
    # Photos personnelles locales
    "Anse Noire": "/assets/images/anse_noir/anse_noir_1.jpeg",
    "Anse Dufour": "/assets/images/anse_dufour/anse_dufour_1.jpeg",
    "Anse Couleuvre": "/assets/images/anse_couleuvre/anse_couleuvre_1.jpeg",
    "Cascade Couleuvre": "/assets/images/photos_vignettes/cascade_couleuvre.JPG",
    # Copies locales de photos Wikimedia Commons
    "Anse Céron": "/assets/images/wikimedia/anse_ceron.jpg",
    "Grande Anse des Salines": "/assets/images/wikimedia/martinique_11_les_salines_beach.jpg",
    "Plage du Diamant": "/assets/images/wikimedia/plage_du_diamant.jpg",
    "Anse à l'Ane": "/assets/images/wikimedia/anse_a_l_ane.jpg",
    "Anse Tartane": "/assets/images/wikimedia/plage_de_tartane_martinique.jpg",
    "Plage de l'Anse Mitan": "/assets/images/wikimedia/anse_mitan_beach_1_2008.jpg",
    "Montagne Pelée - Sommet (Aileron)": "/assets/images/wikimedia/montagne_pelee.jpg",
    "Presqu'île de la Caravelle": "/assets/images/wikimedia/presqu_ile_de_la_caravelle_mancenilliers.jpg",
    "Pitons du Carbet - Grand Piton (1 196 m)": "/assets/images/wikimedia/pitons_du_carbet.jpg",
    "Morne Larcher": "/assets/images/wikimedia/morne_larcher.jpg",
    "Sentier des Caps (Sainte-Anne)": "/assets/images/wikimedia/trace_des_caps_sainte_anne.jpg",
    # Photo de substitution : le badge "à modifier" s'affiche sur cette vignette
    # dans le catalogue tant qu'une vraie photo du lieu n'est pas disponible.
    "Gorges de la Falaise": "/assets/images/wikimedia/cascade_du_saut_du_gendarme_fonds_saint_denis_martinique_01.jpg",
}


def update_images():
    """Assigne une image_url à chaque activité existante."""
    db = SessionLocal()
    try:
        updated = 0
        for name, url in IMAGES.items():
            poi = db.query(PointOfInterest).filter(PointOfInterest.name == name).first()
            if poi:
                poi.image_url = url
                updated += 1
                print(f"  OK : {name}")
            else:
                print(f"  Introuvable : {name}")
        db.commit()
        print(f"\n{updated}/{len(IMAGES)} activités mises à jour.")
    except Exception as e:
        db.rollback()
        print(f"Erreur : {e}")
        raise
    finally:
        db.close()


if __name__ == "__main__":
    update_images()