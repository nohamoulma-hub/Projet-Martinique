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
# Deux sources : photos personnelles servies en local (/assets/...) et
# photos Wikimedia Commons (licence Creative Commons) pour les lieux non encore photographiés.
IMAGES = {
    # Photos personnelles locales
    "Anse Noire": "/assets/images/anse_noir/anse_noir_1.jpeg",
    "Anse Couleuvre": "/assets/images/anse_couleuvre/anse_couleuvre_1.jpeg",
    "Cascade Couleuvre": "/assets/images/photos_vignettes/cascade_couleuvre.JPG",
    # Photos Wikimedia Commons
    "Anse Céron": "https://upload.wikimedia.org/wikipedia/commons/f/fe/Anse_C%C3%A9ron.JPG",
    "Grande Anse des Salines": "https://upload.wikimedia.org/wikipedia/commons/9/95/Martinique-11-Les_Salines_Beach.jpg",
    "Anse Dufour": "https://upload.wikimedia.org/wikipedia/commons/9/98/Anse_Dufour_-_panoramio.jpg",
    "Plage du Diamant": "https://upload.wikimedia.org/wikipedia/commons/f/f9/Plage_du_Diamant.jpg",
    "Anse à l'Ane": "https://upload.wikimedia.org/wikipedia/commons/d/db/Anse_%C3%A0_l%27%C3%A2ne.jpg",
    "Anse Tartane": "https://upload.wikimedia.org/wikipedia/commons/4/44/Plage_de_Tartane%2C_Martinique.JPG",
    "Plage de l'Anse Mitan": "https://upload.wikimedia.org/wikipedia/commons/0/06/Anse_Mitan_beach_%281%29_2008.jpg",
    "Montagne Pelée - Sommet (Aileron)": "https://upload.wikimedia.org/wikipedia/commons/6/6e/Montagne_Pel%C3%A9e.JPG",
    "Presqu'île de la Caravelle": "https://upload.wikimedia.org/wikipedia/commons/e/ec/Presqu%27%C3%AEle_de_la_Caravelle_-_mancenilliers.jpg",
    "Pitons du Carbet - Grand Piton (1 196 m)": "https://upload.wikimedia.org/wikipedia/commons/9/9c/Pitons_du_Carbet.jpg",
    "Morne Larcher": "https://upload.wikimedia.org/wikipedia/commons/9/9a/Morne_larcher.jpg",
    "Sentier des Caps (Sainte-Anne)": "https://upload.wikimedia.org/wikipedia/commons/0/02/Trace_des_Caps%2C_Sainte-Anne.jpg",
    # Photo de substitution : le badge "à modifier" s'affiche sur cette vignette
    # dans le catalogue tant qu'une vraie photo du lieu n'est pas disponible.
    "Gorges de la Falaise": "https://upload.wikimedia.org/wikipedia/commons/6/6f/Cascade_du_Saut_du_Gendarme_%28Fonds-Saint-Denis%2C_Martinique%29_-_01.jpg",
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