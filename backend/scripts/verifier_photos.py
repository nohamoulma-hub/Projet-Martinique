"""
Vérifie que toutes les URL de photos enregistrées en base répondent.
Lancer depuis la racine du projet avec :
    docker compose exec backend python scripts/verifier_photos.py

Contrôle les image_url des activités et les url de la galerie (table poi_images).
Les photos des rhumeries sont hébergées par Wikimedia Commons : ce script permet de
détecter un lien mort, par exemple si un fichier est renommé ou supprimé là-bas.

Wikimedia limite le débit par adresse IP. Le script espace donc ses requêtes et
retente en cas de 429, mais un réseau déjà très sollicité peut malgré tout se faire
refuser : un ECHEC 429 signale une limitation, pas forcément un lien mort.
"""
import os
import sys
import time
import urllib.error
import urllib.request

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.core.database import SessionLocal
from app.models.poi_image import PoiImage
from app.models.point_of_interest import PointOfInterest

DELAI = 2.0          # secondes entre deux requetes
RETENTES = 2         # nouvelles tentatives apres un 429
UA = {"User-Agent": "ProjetMartinique/1.0 (verification des liens photos)"}


# Teste une URL et retourne (ok, message).
def tester(url):
    for essai in range(RETENTES + 1):
        try:
            req = urllib.request.Request(url, headers=UA, method="HEAD")
            with urllib.request.urlopen(req, timeout=30) as r:
                return True, f"{r.status}"
        except urllib.error.HTTPError as e:
            if e.code == 429 and essai < RETENTES:
                time.sleep(15 * (essai + 1))
                continue
            return False, f"HTTP {e.code}"
        except Exception as e:
            return False, type(e).__name__
    return False, "429 persistant"


def verifier():
    """Parcourt les URL distantes de la base et signale celles qui ne repondent pas."""
    db = SessionLocal()
    try:
        liens = []
        for poi in db.query(PointOfInterest).order_by(PointOfInterest.name).all():
            if poi.image_url and poi.image_url.startswith("http"):
                liens.append((poi.name, "couverture", poi.image_url))
        for img in db.query(PoiImage).order_by(PoiImage.poi_id, PoiImage.order).all():
            if img.url and img.url.startswith("http"):
                poi = db.query(PointOfInterest).get(img.poi_id)
                liens.append((poi.name if poi else "?", f"galerie {img.order}", img.url))

        # Les fichiers locaux de /assets/ ne sont pas testes ici : ils sont servis par nginx.
        print(f"{len(liens)} URL distantes à vérifier, {DELAI}s entre chaque.\n")

        echecs = []
        for nom, role, url in liens:
            ok, msg = tester(url)
            if not ok:
                echecs.append((nom, role, url, msg))
            print(f"  {'OK ' if ok else 'ECHEC'} {msg:9} {nom[:26]:28} {role}")
            time.sleep(DELAI)

        print()
        if echecs:
            print(f"{len(echecs)} lien(s) en échec :")
            for nom, role, url, msg in echecs:
                print(f"  {nom} ({role}) : {msg}\n    {url}")
        else:
            print("Tous les liens répondent.")

    finally:
        db.close()


if __name__ == "__main__":
    verifier()
