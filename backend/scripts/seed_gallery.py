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



# Galeries des rhumeries : photos Wikimedia Commons sous licence libre.
# Contrairement aux plages, ces URL sont distantes et non des fichiers locaux de
# /assets/. La page de description de chaque fichier, qui porte l'attribution
# exigee par les licences CC BY et CC BY-SA, est listee dans CREDITS_PHOTOS.md.
GALLERIES_RHUMERIES = {
    "Distillerie Neisson": [
        # Chai de la distillerie Neisson.jpg (CC BY-SA 4.0)
        "https://thumb.wikimedia.org/wikipedia/commons/thumb/5/51/Chai_de_la_distillerie_Neisson.jpg/1280px-Chai_de_la_distillerie_Neisson.jpg",
        # Colonne à distiller.JPG (CC BY-SA 3.0)
        "https://upload.wikimedia.org/wikipedia/commons/1/11/Colonne_%C3%A0_distiller.JPG",
        # Rhum Neisson.jpg (CC BY-SA 4.0)
        "https://upload.wikimedia.org/wikipedia/commons/0/00/Rhum_Neisson.jpg",
    ],
    "Rhum Trois Rivières": [
        # Trois Rivieres facade enseigne moulin 2015.jpg (CC BY-SA 4.0)
        "https://thumb.wikimedia.org/wikipedia/commons/thumb/3/34/Trois_Rivieres_facade_enseigne_moulin_2015.jpg/1280px-Trois_Rivieres_facade_enseigne_moulin_2015.jpg",
        # Trois-Rivières - Martinique.jpg (CC BY-SA 4.0)
        "https://thumb.wikimedia.org/wikipedia/commons/thumb/7/7b/Trois-Rivi%C3%A8res_-_Martinique.jpg/1280px-Trois-Rivi%C3%A8res_-_Martinique.jpg",
        # Trois Rivières 001.jpg (CC BY-SA 3.0)
        "https://thumb.wikimedia.org/wikipedia/commons/thumb/4/43/Trois_Rivi%C3%A8res_001.jpg/1280px-Trois_Rivi%C3%A8res_001.jpg",
        # 3 rivieres colonne distiller.jpg (CC BY-SA 3.0)
        "https://upload.wikimedia.org/wikipedia/commons/d/d5/3_rivieres_colonne_distiller.jpg",
        # Rhum Trois Rivières.jpg (CC BY-SA 4.0)
        "https://upload.wikimedia.org/wikipedia/commons/7/7c/Rhum_Trois_Rivi%C3%A8res.jpg",
    ],
    "Distillerie Saint-James": [
        # Martinique-sainte-marie-rhumerie-saint-james.jpg (Public domain)
        "https://thumb.wikimedia.org/wikipedia/commons/thumb/7/7b/Martinique-sainte-marie-rhumerie-saint-james.jpg/1280px-Martinique-sainte-marie-rhumerie-saint-james.jpg",
        # St James Rhum museum in Martinique.jpg (CC BY 4.0)
        "https://upload.wikimedia.org/wikipedia/commons/2/27/St_James_Rhum_museum_in_Martinique.jpg",
        # Rhum des plantations Saint James-IMG 6029.jpg (CC BY-SA 2.0 fr)
        "https://thumb.wikimedia.org/wikipedia/commons/thumb/a/a3/Rhum_des_plantations_Saint_James-IMG_6029.jpg/1280px-Rhum_des_plantations_Saint_James-IMG_6029.jpg",
        # Saint james livraison canne.jpg (CC BY-SA 3.0)
        "https://upload.wikimedia.org/wikipedia/commons/a/ae/Saint_james_livraison_canne.jpg",
        # J. Depaz - Distillery, Plantation St. James, Martinique 5610834659.jpg (Public domain)
        "https://thumb.wikimedia.org/wikipedia/commons/thumb/4/45/J._Depaz_-_Distillery%2C_Plantation_St._James%2C_Martinique_5610834659.jpg/1280px-J._Depaz_-_Distillery%2C_Plantation_St._James%2C_Martinique_5610834659.jpg",
    ],
    "Distillerie J.M": [
        # Rhumerie JM.JPG (CC BY-SA 3.0)
        "https://upload.wikimedia.org/wikipedia/commons/a/a3/Rhumerie_JM.JPG",
        # Distillerie de Fonds-Préville.JPG (CC BY-SA 3.0)
        "https://upload.wikimedia.org/wikipedia/commons/e/e6/Distillerie_de_Fonds-Pr%C3%A9ville.JPG",
        # Rhum J.M.jpg (CC BY-SA 4.0)
        "https://upload.wikimedia.org/wikipedia/commons/a/a3/Rhum_J.M.jpg",
    ],
    "Distillerie La Mauny": [
        # La Mauny 001.jpg (CC BY-SA 3.0)
        "https://thumb.wikimedia.org/wikipedia/commons/thumb/b/b3/La_Mauny_001.jpg/1280px-La_Mauny_001.jpg",
    ],
    "Habitation Clément": [
        # Les chais de l'habitation Clément en Martinique.jpg (CC BY-SA 4.0)
        "https://thumb.wikimedia.org/wikipedia/commons/thumb/a/a2/Les_chais_de_l%27habitation_Cl%C3%A9ment_en_Martinique.jpg/1280px-Les_chais_de_l%27habitation_Cl%C3%A9ment_en_Martinique.jpg",
        # Habitation Clément, Martinique.jpg (CC BY-SA 4.0)
        "https://upload.wikimedia.org/wikipedia/commons/8/80/Habitation_Cl%C3%A9ment%2C_Martinique.jpg",
        # Ancienne distillerie habitation Clément 1.JPG (CC BY-SA 4.0)
        "https://thumb.wikimedia.org/wikipedia/commons/thumb/a/aa/Ancienne_distillerie_habitation_Cl%C3%A9ment_1.JPG/1280px-Ancienne_distillerie_habitation_Cl%C3%A9ment_1.JPG",
        # Habitation Clément (Le François, Martinique) - 01.jpg (CC0)
        "https://thumb.wikimedia.org/wikipedia/commons/thumb/f/f3/Habitation_Cl%C3%A9ment_%28Le_Fran%C3%A7ois%2C_Martinique%29_-_01.jpg/1280px-Habitation_Cl%C3%A9ment_%28Le_Fran%C3%A7ois%2C_Martinique%29_-_01.jpg",
        # Jardin habitation Clément 24.JPG (CC BY-SA 4.0)
        "https://thumb.wikimedia.org/wikipedia/commons/thumb/e/ef/Jardin_habitation_Cl%C3%A9ment_24.JPG/1280px-Jardin_habitation_Cl%C3%A9ment_24.JPG",
    ],
    "Distillerie Depaz": [
        # Château Depaz.jpg (CC BY-SA 1.0)
        "https://thumb.wikimedia.org/wikipedia/commons/thumb/5/5d/Ch%C3%A2teau_Depaz.jpg/1280px-Ch%C3%A2teau_Depaz.jpg",
        # Rhumerie Depaz.jpg (CC BY-SA 4.0)
        "https://thumb.wikimedia.org/wikipedia/commons/thumb/f/fc/Rhumerie_Depaz.jpg/1280px-Rhumerie_Depaz.jpg",
        # Rhum Depaz 01.jpg (CC BY-SA 4.0)
        "https://thumb.wikimedia.org/wikipedia/commons/thumb/7/7d/Rhum_Depaz_01.jpg/1280px-Rhum_Depaz_01.jpg",
        # Rhum Depaz 02.jpg (CC BY-SA 4.0)
        "https://thumb.wikimedia.org/wikipedia/commons/thumb/0/0d/Rhum_Depaz_02.jpg/1280px-Rhum_Depaz_02.jpg",
        # Rhum Depaz 03.jpg (CC BY-SA 4.0)
        "https://thumb.wikimedia.org/wikipedia/commons/thumb/e/eb/Rhum_Depaz_03.jpg/1280px-Rhum_Depaz_03.jpg",
    ],
    "Distillerie Dillon": [
        # Distillerie Dillon.JPG (CC BY-SA 3.0)
        "https://thumb.wikimedia.org/wikipedia/commons/thumb/0/01/Distillerie_Dillon.JPG/1280px-Distillerie_Dillon.JPG",
    ],
}


def seed_gallery():
    """Remplace les photos de galerie de chaque activité listée dans GALLERIES."""
    db = SessionLocal()
    try:
        total = 0
        for name, urls in {**GALLERIES, **GALLERIES_RHUMERIES}.items():
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
