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



# Galeries des rhumeries : photos Wikimedia Commons sous licence libre, copiees en
# local dans /assets/images/wikimedia/ (vignettes 1280 px) : chargees chez Wikimedia,
# elles etaient refusees (429) des que le debit montait. L'auteur et la licence de
# chaque fichier, exiges par les licences CC BY et CC BY-SA, sont dans CREDITS_PHOTOS.md.
GALLERIES_RHUMERIES = {
    "Distillerie Neisson": [
        # Chai de la distillerie Neisson.jpg (CC BY-SA 4.0)
        "/assets/images/wikimedia/chai_de_la_distillerie_neisson.jpg",
        # Colonne à distiller.JPG (CC BY-SA 3.0)
        "/assets/images/wikimedia/colonne_a_distiller.jpg",
        # Rhum Neisson.jpg (CC BY-SA 4.0)
        "/assets/images/wikimedia/rhum_neisson.jpg",
    ],
    "Rhum Trois Rivières": [
        # Trois Rivieres facade enseigne moulin 2015.jpg (CC BY-SA 4.0)
        "/assets/images/wikimedia/trois_rivieres_facade_enseigne_moulin_2015.jpg",
        # Trois-Rivières - Martinique.jpg (CC BY-SA 4.0)
        "/assets/images/wikimedia/trois_rivieres_martinique.jpg",
        # Trois Rivières 001.jpg (CC BY-SA 3.0)
        "/assets/images/wikimedia/trois_rivieres_001.jpg",
        # 3 rivieres colonne distiller.jpg (CC BY-SA 3.0)
        "/assets/images/wikimedia/3_rivieres_colonne_distiller.jpg",
        # Rhum Trois Rivières.jpg (CC BY-SA 4.0)
        "/assets/images/wikimedia/rhum_trois_rivieres.jpg",
    ],
    "Distillerie Saint-James": [
        # Martinique-sainte-marie-rhumerie-saint-james.jpg (Public domain)
        "/assets/images/wikimedia/martinique_sainte_marie_rhumerie_saint_james.jpg",
        # St James Rhum museum in Martinique.jpg (CC BY 4.0)
        "/assets/images/wikimedia/st_james_rhum_museum_in_martinique.jpg",
        # Rhum des plantations Saint James-IMG 6029.jpg (CC BY-SA 2.0 fr)
        "/assets/images/wikimedia/rhum_des_plantations_saint_james_img_6029.jpg",
        # Saint james livraison canne.jpg (CC BY-SA 3.0)
        "/assets/images/wikimedia/saint_james_livraison_canne.jpg",
        # J. Depaz - Distillery, Plantation St. James, Martinique 5610834659.jpg (Public domain)
        "/assets/images/wikimedia/j_depaz_distillery_plantation_st_james_martinique_5610834659.jpg",
    ],
    "Distillerie J.M": [
        # Rhumerie JM.JPG (CC BY-SA 3.0)
        "/assets/images/wikimedia/rhumerie_jm.jpg",
        # Distillerie de Fonds-Préville.JPG (CC BY-SA 3.0)
        "/assets/images/wikimedia/distillerie_de_fonds_preville.jpg",
        # Rhum J.M.jpg (CC BY-SA 4.0)
        "/assets/images/wikimedia/rhum_j_m.jpg",
    ],
    "Distillerie La Mauny": [
        # La Mauny 001.jpg (CC BY-SA 3.0)
        "/assets/images/wikimedia/la_mauny_001.jpg",
    ],
    "Habitation Clément": [
        # Les chais de l'habitation Clément en Martinique.jpg (CC BY-SA 4.0)
        "/assets/images/wikimedia/les_chais_de_l_habitation_clement_en_martinique.jpg",
        # Habitation Clément, Martinique.jpg (CC BY-SA 4.0)
        "/assets/images/wikimedia/habitation_clement_martinique.jpg",
        # Ancienne distillerie habitation Clément 1.JPG (CC BY-SA 4.0)
        "/assets/images/wikimedia/ancienne_distillerie_habitation_clement_1.jpg",
        # Habitation Clément (Le François, Martinique) - 01.jpg (CC0)
        "/assets/images/wikimedia/habitation_clement_le_francois_martinique_01.jpg",
        # Jardin habitation Clément 24.JPG (CC BY-SA 4.0)
        "/assets/images/wikimedia/jardin_habitation_clement_24.jpg",
    ],
    "Distillerie Depaz": [
        # Château Depaz.jpg (CC BY-SA 1.0)
        "/assets/images/wikimedia/chateau_depaz.jpg",
        # Rhumerie Depaz.jpg (CC BY-SA 4.0)
        "/assets/images/wikimedia/rhumerie_depaz.jpg",
        # Rhum Depaz 01.jpg (CC BY-SA 4.0)
        "/assets/images/wikimedia/rhum_depaz_01.jpg",
        # Rhum Depaz 02.jpg (CC BY-SA 4.0)
        "/assets/images/wikimedia/rhum_depaz_02.jpg",
        # Rhum Depaz 03.jpg (CC BY-SA 4.0)
        "/assets/images/wikimedia/rhum_depaz_03.jpg",
    ],
    "Distillerie Dillon": [
        # Distillerie Dillon.JPG (CC BY-SA 3.0)
        "/assets/images/wikimedia/distillerie_dillon.jpg",
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
