"""
Peuple la table poi_images avec les photos de galerie des activités.
Lancer depuis le dossier backend/ avec : python scripts/seed_gallery.py

Idempotent : les photos existantes d'une activité sont remplacées à chaque exécution.
"""
import sys
import os

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.core.database import SessionLocal
from app.models.poi_image import PoiImage
from app.models.point_of_interest import PointOfInterest

# Photos personnelles par activité, dans l'ordre d'affichage de la galerie.
# La première photo occupe la grande case de la grille sur la page de détail.
GALLERIES = {
    "Anse Noire": [
        "/assets/images/anse_noir/anse_noir_1.jpeg",
        "/assets/images/anse_noir/anse_noir_2.jpeg",
    ],
    "Anse Dufour": [
        "/assets/images/anse_dufour/anse_dufour_1.jpeg",
        "/assets/images/anse_dufour/anse_dufour_2.jpeg",
        "/assets/images/anse_dufour/anse_dufour-3.jpeg",
        "/assets/images/anse_dufour/anse_dufour_4.jpeg",
    ],
    "Anse Couleuvre": [
        "/assets/images/anse_couleuvre/anse_couleuvre_4.jpeg",
        "/assets/images/anse_couleuvre/anse_couleuvre_1.jpeg",
        "/assets/images/anse_couleuvre/anse_couleuvre_2.jpeg",
        "/assets/images/anse_couleuvre/anse_couleuvre_3.jpeg",
    ],
}


def seed_gallery():
    """Remplace les photos de galerie de chaque activité listée dans GALLERIES."""
    db = SessionLocal()
    try:
        total = 0
        for name, urls in GALLERIES.items():
            poi = db.query(PointOfInterest).filter(PointOfInterest.name == name).first()
            if poi is None:
                print(f"  Introuvable : {name}")
                continue

            # Suppression des photos existantes pour éviter les doublons
            db.query(PoiImage).filter(PoiImage.poi_id == poi.id).delete()

            for order, url in enumerate(urls):
                db.add(PoiImage(poi_id=poi.id, url=url, order=order))

            total += len(urls)
            print(f"  OK : {name} ({len(urls)} photos)")

        db.commit()
        print(f"\n{total} photos de galerie enregistrées.")

    except Exception as e:
        db.rollback()
        print(f"Erreur : {e}")
        raise
    finally:
        db.close()


if __name__ == "__main__":
    seed_gallery()
