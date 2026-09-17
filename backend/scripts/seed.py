"""
Script de peuplement de la base de données avec des données réalistes de Martinique.
Lancer depuis le dossier backend/ avec : python scripts/seed.py
"""
import sys
import os

# Permet d'importer app.* depuis le dossier backend/
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.core.database import SessionLocal
from app.models.beach_details import BeachDetails
from app.models.hike_details import HikeDetails
from app.models.point_of_interest import Category, PointOfInterest
from app.models.rum_distillery_details import RumDistilleryDetails


# Données des plages : vraies plages de Martinique avec coordonnées GPS réelles
BEACHES = [
    {
        "poi": {
            "name": "Anse Céron",
            "category": Category.BEACH,
            "description": (
                "Plage sauvage au nord de la presqu'île de la Caravelle, "
                "connue pour ses cocotiers et son caractère préservé. "
                "Accessible en voiture depuis Saint-Pierre."
            ),
            "latitude": 14.8442,
            "longitude": -61.1812,
            "address": "Le Prêcheur, Martinique",
        },
        "details": {
            "tourist_score": 2,
            "amenities": "Parking, accès direct à la mer, aucun équipement sur place",
        },
    },
    {
        "poi": {
            "name": "Grande Anse des Salines",
            "category": Category.BEACH,
            "description": (
                "La plage la plus célèbre de Martinique, au sud de l'île. "
                "Sable blanc fin, eau turquoise, cocotiers et filaos. "
                "Idéale pour les familles, bien équipée."
            ),
            "latitude": 14.3969,
            "longitude": -60.8726,
            "address": "Sainte-Anne, Martinique",
        },
        "details": {
            "tourist_score": 5,
            "amenities": "Parking, douches, toilettes, restaurants, transats à louer, snorkeling",
        },
    },
    {
        "poi": {
            "name": "Anse Noire",
            "category": Category.BEACH,
            "description": (
                "Petite crique au sable volcanique noir, l'une des rares plages "
                "de sable sombre de Martinique. Eaux calmes, idéales pour la plongée en apnée. "
                "Accessible à pied depuis Anse Dufour (10 minutes)."
            ),
            "latitude": 14.5383,
            "longitude": -61.0726,
            "address": "Les Anses-d'Arlet, Martinique",
        },
        "details": {
            "tourist_score": 3,
            "amenities": "Pas de parking sur place, eau douce, tortues marines fréquentes",
        },
    },
    {
        "poi": {
            "name": "Anse Dufour",
            "category": Category.BEACH,
            "description": (
                "Plage de sable blanc dans un village de pêcheurs authentique. "
                "Eaux claires, bateaux de pêche colorés, tortues marines régulièrement observées. "
                "Ambiance locale préservée."
            ),
            "latitude": 14.5397,
            "longitude": -61.0705,
            "address": "Les Anses-d'Arlet, Martinique",
        },
        "details": {
            "tourist_score": 3,
            "amenities": "Parking à l'entrée du village, snack-bars, plongée avec masque",
        },
    },
    {
        "poi": {
            "name": "Plage du Diamant",
            "category": Category.BEACH,
            "description": (
                "Longue plage de 3 km face au Rocher du Diamant, l'un des symboles "
                "de la Martinique. Courants forts, baignade déconseillée, mais paysage magnifique. "
                "Surf et kitesurf pratiqués."
            ),
            "latitude": 14.4706,
            "longitude": -61.0276,
            "address": "Le Diamant, Martinique",
        },
        "details": {
            "tourist_score": 4,
            "amenities": "Parking, restaurants, location de planches, vue sur le Rocher du Diamant",
        },
    },
    {
        "poi": {
            "name": "Anse à l'Ane",
            "category": Category.BEACH,
            "description": (
                "Plage familiale aux eaux calmes, peu fréquentée. "
                "Vue sur les Anses-d'Arlet et les Trois-Ilets. "
                "Idéale pour les enfants et le snorkeling."
            ),
            "latitude": 14.5488,
            "longitude": -61.0574,
            "address": "Les Trois-Ilets, Martinique",
        },
        "details": {
            "tourist_score": 3,
            "amenities": "Parking, restaurant, douches, location de kayaks",
        },
    },
    {
        "poi": {
            "name": "Anse Tartane",
            "category": Category.BEACH,
            "description": (
                "Plage sur la côte atlantique de la presqu'île de la Caravelle. "
                "Vagues régulières appréciées des surfeurs. "
                "Village de pêcheurs à proximité."
            ),
            "latitude": 14.7622,
            "longitude": -60.8821,
            "address": "La Trinité, Martinique",
        },
        "details": {
            "tourist_score": 2,
            "amenities": "Parking, snack-bar, location de planches de surf",
        },
    },
    {
        "poi": {
            "name": "Plage de l'Anse Mitan",
            "category": Category.BEACH,
            "description": (
                "Plage très prisée en face de Fort-de-France, dans la baie de la Pagerie. "
                "Nombreux restaurants, hôtels et clubs de plongée à proximité. "
                "Très animée en été."
            ),
            "latitude": 14.5562,
            "longitude": -61.0596,
            "address": "Les Trois-Ilets, Martinique",
        },
        "details": {
            "tourist_score": 4,
            "amenities": "Parking, restaurants, clubs de plongée, location de jet-ski, navettes vers Fort-de-France",
        },
    },
    {
        "poi": {
            "name": "Anse Couleuvre",
            "category": Category.BEACH,
            "description": (
                "Crique sauvage nichée dans la forêt tropicale du nord de la Martinique, "
                "accessible uniquement à pied depuis Le Prêcheur. Eaux transparentes, "
                "sable noir et ambiance préservée. Le sentier qui y mène longe la Cascade Couleuvre."
            ),
            "latitude": 14.8465,
            "longitude": -61.2283,
            "address": "Le Prêcheur, Martinique",
        },
        "details": {
            "tourist_score": 2,
            "amenities": "Aucun équipement - plage sauvage",
        },
    },
]

# Données des randonnées : vraies randonnées de Martinique
HIKES = [
    {
        "poi": {
            "name": "Montagne Pelée - Sommet (Aileron)",
            "category": Category.HIKE,
            "description": (
                "La randonnée emblématique de Martinique. "
                "Ascension du volcan actif (1 397 m) par le chemin de l'Aileron. "
                "Vue panoramique sur toute l'île par temps clair. "
                "Prévoir vêtements chauds et imperméables."
            ),
            "latitude": 14.8157,
            "longitude": -61.1672,
            "address": "Morne Rouge, Martinique",
        },
        "details": {
            "difficulty": "Difficile",
            "elevation_gain": 640,
            "elevation_loss": 640,
            "duration": 270,
        },
    },
    {
        "poi": {
            "name": "Presqu'île de la Caravelle",
            "category": Category.HIKE,
            "description": (
                "Boucle dans la réserve naturelle de la Caravelle. "
                "Paysages variés : forêt tropicale, mangrove, falaises et criques. "
                "Ruines du château Dubuc accessibles sur le chemin. "
                "Très accessible pour tous niveaux."
            ),
            "latitude": 14.7736,
            "longitude": -60.8598,
            "address": "La Trinité, Martinique",
        },
        "details": {
            "difficulty": "Facile",
            "elevation_gain": 150,
            "elevation_loss": 150,
            "duration": 150,
        },
    },
    {
        "poi": {
            "name": "Pitons du Carbet - Grand Piton (1 196 m)",
            "category": Category.HIKE,
            "description": (
                "Ascension du deuxième plus haut sommet de Martinique, "
                "dans la forêt tropicale humide. Sentier glissant et exigeant. "
                "Vue exceptionnelle sur la baie de Fort-de-France. "
                "Guide recommandé par mauvais temps."
            ),
            "latitude": 14.7014,
            "longitude": -61.1242,
            "address": "Carbet, Martinique",
        },
        "details": {
            "difficulty": "Difficile",
            "elevation_gain": 890,
            "elevation_loss": 890,
            "duration": 360,
        },
    },
    {
        "poi": {
            "name": "Gorges de la Falaise",
            "category": Category.HIKE,
            "description": (
                "Randonnée aquatique dans les gorges de la rivière Falaise, au nord de l'île. "
                "On marche dans l'eau (niveau mollets à ceinture) pour atteindre la cascade. "
                "Tenue aquatique obligatoire. Déconseillé après de fortes pluies."
            ),
            "latitude": 14.8245,
            "longitude": -61.1238,
            "address": "Ajoupa-Bouillon, Martinique",
        },
        "details": {
            "difficulty": "Moyen",
            "elevation_gain": 80,
            "elevation_loss": 80,
            "duration": 90,
        },
    },
    {
        "poi": {
            "name": "Morne Larcher",
            "category": Category.HIKE,
            "description": (
                "Boucle autour du morne Larcher avec vue sur le Rocher du Diamant. "
                "Sentier ombragé en forêt tropicale. "
                "Possibilité de descendre sur la plage du Diamant en fin de randonnée."
            ),
            "latitude": 14.4782,
            "longitude": -61.0282,
            "address": "Le Diamant, Martinique",
        },
        "details": {
            "difficulty": "Moyen",
            "elevation_gain": 370,
            "elevation_loss": 370,
            "duration": 180,
        },
    },
    {
        "poi": {
            "name": "Cascade Couleuvre",
            "category": Category.HIKE,
            "description": (
                "Courte randonnée en forêt tropicale humide menant à une belle cascade. "
                "Idéale pour une sortie familiale. Chemin bien balisé. "
                "Baignade possible dans le bassin en bas de la cascade."
            ),
            "latitude": 14.8261,
            "longitude": -61.1835,
            "address": "Le Prêcheur, Martinique",
        },
        "details": {
            "difficulty": "Facile",
            "elevation_gain": 120,
            "elevation_loss": 120,
            "duration": 75,
        },
    },
    {
        "poi": {
            "name": "Sentier des Caps (Sainte-Anne)",
            "category": Category.HIKE,
            "description": (
                "Randonnée côtière au sud de la Martinique reliant plusieurs plages et criques. "
                "Paysages de savanes et de falaises calcaires. "
                "Vue sur les Saintes et la Dominique par temps clair."
            ),
            "latitude": 14.4025,
            "longitude": -60.8895,
            "address": "Sainte-Anne, Martinique",
        },
        "details": {
            "difficulty": "Facile",
            "elevation_gain": 80,
            "elevation_loss": 80,
            "duration": 120,
        },
    },
]


# Donnees des rhumeries.
# Coordonnees relevees sur OpenStreetMap, descriptions etablies d'apres Wikipedia fr.
# Photos : Wikimedia Commons, licences libres verifiees une a une (CC0, CC BY,
# CC BY-SA ou domaine public). Les URL pointent des vignettes de 1280 px et non les
# fichiers d'origine, qui atteignent plusieurs Mo : Wikimedia demande explicitement
# d'utiliser les vignettes pour la reutilisation.
# Une rhumerie n'a pas de table de details dediee, contrairement aux plages et aux
# randonnees : seule la fiche PointOfInterest existe.
RHUMERIES = [
    {
        "poi": {
            "name": "Distillerie Neisson",
            "category": Category.RUM_DISTILLERY,
            "description": (
                "Distillerie de rhum agricole installée au Carbet, sur la côte caraïbe, "
                "entre Bellefontaine et Saint-Pierre. Elle est aussi désignée sous le "
                "nom de Thieubert."
            ),
            "latitude": 14.7002,
            "longitude": -61.1765,
            "address": "Le Carbet, Martinique",
            "image_url": "https://thumb.wikimedia.org/wikipedia/commons/thumb/5/51/Chai_de_la_distillerie_Neisson.jpg/1280px-Chai_de_la_distillerie_Neisson.jpg",
        },
        "details": {
            "opening_hours": "Mo-Fr 08:00-17:00; Sa 08:30-12:00; Su 09:00-12:00",
            "phone": "+33 596 78 03 70",
            "website": "https://neisson.fr/",
            # Non documentes dans OpenStreetMap : a renseigner a la main.
            "tourist_score": None,
            "visit_access": None,
            "pets_allowed": None,
        },
    },
    {
        "poi": {
            "name": "Rhum Trois Rivières",
            "category": Category.RUM_DISTILLERY,
            "description": (
                "Domaine historique de Sainte-Luce, reconnaissable à son moulin. Le "
                "rhum Trois Rivières n'y est plus distillé depuis 2004 : la production "
                "a été transférée à la distillerie La Mauny, à Rivière-Pilote."
            ),
            "latitude": 14.4797,
            "longitude": -60.9648,
            "address": "Sainte-Luce, Martinique",
            "image_url": "https://thumb.wikimedia.org/wikipedia/commons/thumb/3/34/Trois_Rivieres_facade_enseigne_moulin_2015.jpg/1280px-Trois_Rivieres_facade_enseigne_moulin_2015.jpg",
        },
        "details": {
            "opening_hours": "Mo-Su 09:00-17:00",
            "phone": "+33 5 96 62 51 78",
            "website": "https://plantationtroisrivieres.com/",
            # Non documentes dans OpenStreetMap : a renseigner a la main.
            "tourist_score": None,
            "visit_access": None,
            "pets_allowed": None,
        },
    },
    {
        "poi": {
            "name": "Distillerie Saint-James",
            "category": Category.RUM_DISTILLERY,
            "description": (
                "Distillerie de rhum agricole de Sainte-Marie, installée d'abord sur le "
                "site de l'habitation Trou-Vaillant, à Saint-Pierre. Elle abrite un "
                "musée du rhum."
            ),
            "latitude": 14.7835,
            "longitude": -60.9973,
            "address": "Sainte-Marie, Martinique",
            "image_url": "https://thumb.wikimedia.org/wikipedia/commons/thumb/7/7b/Martinique-sainte-marie-rhumerie-saint-james.jpg/1280px-Martinique-sainte-marie-rhumerie-saint-james.jpg",
        },
        "details": {
            "opening_hours": None,
            "phone": "+33 5 96 69 30 02",
            "website": "https://rhum-saintjames.com/",
            # Non documentes dans OpenStreetMap : a renseigner a la main.
            "tourist_score": None,
            "visit_access": None,
            "pets_allowed": None,
        },
    },
    {
        "poi": {
            "name": "Distillerie J.M",
            "category": Category.RUM_DISTILLERY,
            "description": (
                "Rhum agricole produit depuis 1845 à Macouba, dans le nord de l'île, "
                "entre la rivière Roches et la rivière de Macouba, au pied de la "
                "montagne Pelée. La distillerie occupe les 300 hectares de l'habitation "
                "de Fonds-Préville, qui existe depuis 1790."
            ),
            "latitude": 14.8628,
            "longitude": -61.1367,
            "address": "Macouba, Martinique",
            "image_url": "https://upload.wikimedia.org/wikipedia/commons/a/a3/Rhumerie_JM.JPG",
        },
        "details": {
            "opening_hours": "Mo-Su 09:00-17:00",
            "phone": "+596596789255",
            "website": "https://www.rhum-jm.com/",
            # Non documentes dans OpenStreetMap : a renseigner a la main.
            "tourist_score": None,
            "visit_access": None,
            "pets_allowed": None,
        },
    },
    {
        "poi": {
            "name": "Distillerie La Mauny",
            "category": Category.RUM_DISTILLERY,
            "description": (
                "Distillerie de rhum agricole située à deux kilomètres au nord de "
                "Rivière-Pilote. Elle distille les rhums AOC La Mauny, Duquesne et "
                "Trois Rivières, à partir de cannes cultivées localement."
            ),
            "latitude": 14.5089,
            "longitude": -60.9063,
            "address": "Rivière-Pilote, Martinique",
            "image_url": "https://thumb.wikimedia.org/wikipedia/commons/thumb/b/b3/La_Mauny_001.jpg/1280px-La_Mauny_001.jpg",
        },
        "details": {
            # Saisis a la main : absents d'OpenStreetMap
            "opening_hours": "Tu,We,Sa 09:00-17:30; Fr 09:00-17:00",
            "phone": "+596 596 62 18 79",
            "website": "https://www.maisonlamauny.com/fr-fr/",
            # Non documentes dans OpenStreetMap : a renseigner a la main.
            "tourist_score": None,
            "visit_access": None,
            "pets_allowed": None,
        },
    },
    {
        "poi": {
            "name": "Habitation Clément",
            "category": Category.RUM_DISTILLERY,
            "description": (
                "Ancienne habitation sucrière coloniale du François, autrefois appelée "
                "habitation de l'Acajou. Rachetée en 1887 par Homère Clément, l'un des "
                "tout premiers médecins de couleur de l'île, elle est ensuite convertie "
                "en distillerie. Le domaine se visite : maison créole, chais et "
                "jardins."
            ),
            "latitude": 14.6021,
            "longitude": -60.9067,
            "address": "Le François, Martinique",
            "image_url": "https://thumb.wikimedia.org/wikipedia/commons/thumb/a/a2/Les_chais_de_l%27habitation_Cl%C3%A9ment_en_Martinique.jpg/1280px-Les_chais_de_l%27habitation_Cl%C3%A9ment_en_Martinique.jpg",
        },
        "details": {
            "opening_hours": "Mo-Su 09:00-18:30",
            "phone": None,
            "website": "https://www.fondation-clement.org/",
            # Non documentes dans OpenStreetMap : a renseigner a la main.
            "tourist_score": None,
            "visit_access": None,
            "pets_allowed": None,
        },
    },
    {
        "poi": {
            "name": "Distillerie Depaz",
            "category": Category.RUM_DISTILLERY,
            "description": (
                "Distillerie de rhum agricole de Saint-Pierre, au pied de la montagne "
                "Pelée. Elle a été créée par Victor Depaz (1886-1960), né à "
                "Saint-Pierre, et le château qui domine le domaine porte son nom."
            ),
            "latitude": 14.7588,
            "longitude": -61.1651,
            "address": "Saint-Pierre, Martinique",
            "image_url": "https://thumb.wikimedia.org/wikipedia/commons/thumb/5/5d/Ch%C3%A2teau_Depaz.jpg/1280px-Ch%C3%A2teau_Depaz.jpg",
        },
        "details": {
            "opening_hours": None,
            "phone": "+596 596 78 64 98",
            "website": "https://www.depaz.fr",
            # Non documentes dans OpenStreetMap : a renseigner a la main.
            "tourist_score": None,
            "visit_access": None,
            "pets_allowed": None,
        },
    },
    {
        "poi": {
            "name": "Distillerie Dillon",
            "category": Category.RUM_DISTILLERY,
            "description": (
                "Distillerie installée à Fort-de-France, anciennement habitation "
                "Dillon. Fondée à la fin du XVIIe siècle, l'exploitation produit du "
                "sucre de canne pendant un siècle et demi avant de se tourner vers le "
                "rhum au XIXe siècle."
            ),
            "latitude": 14.6168,
            "longitude": -61.0494,
            "address": "Fort-de-France, Martinique",
            "image_url": "https://thumb.wikimedia.org/wikipedia/commons/thumb/0/01/Distillerie_Dillon.JPG/1280px-Distillerie_Dillon.JPG",
        },
        "details": {
            # Saisis a la main : absents d'OpenStreetMap
            "opening_hours": "Mo-Fr 09:00-16:00",
            # 0596 75 20 20 au format international, comme les autres fiches
            "phone": "+596 596 75 20 20",
            "website": "https://www.rhums-dillon.com/",
            # Non documentes dans OpenStreetMap : a renseigner a la main.
            "tourist_score": None,
            "visit_access": None,
            "pets_allowed": None,
        },
    },
]


def seed():
    """Peuple la base de données avec des plages et randonnées de Martinique."""
    db = SessionLocal()
    try:
        print("Peuplement de la base de données...")

        # Idempotence par fiche et non tout-ou-rien : l'ancienne version s'arretait des
        # que la table contenait une ligne, ce qui empechait d'ajouter une categorie
        # a une base existante sans la detruire.
        existants = {p.name: p for p in db.query(PointOfInterest).all()}
        ajouts = ignores = details_ajoutes = details_completes = 0

        def ajouter(data, libelle, classe_details=None, champ=None):
            nonlocal ajouts, ignores, details_ajoutes, details_completes
            nom = data["poi"]["name"]
            poi = existants.get(nom)

            if poi is None:
                poi = PointOfInterest(**data["poi"])
                db.add(poi)
                db.flush()  # Obtenir l'id avant d'ajouter les détails
                existants[nom] = poi
                ajouts += 1
                print(f"  {libelle} ajoutée : {nom}")
            else:
                ignores += 1

            # Les details sont traites a part : une fiche peut exister sans eux, par
            # exemple quand la table de details a ete creee apres l'insertion de la fiche.
            if classe_details is None or not data.get("details"):
                return
            deja_detail = (
                db.query(classe_details)
                .filter(getattr(classe_details, champ) == poi.id)
                .first()
            )
            if deja_detail is None:
                db.add(classe_details(**{champ: poi.id}, **data["details"]))
                details_ajoutes += 1
                print(f"    infos pratiques ajoutées : {nom}")
                return

            # Ligne deja presente : on ne remplit que les colonnes vides, pour qu'une
            # information ajoutee au script arrive en base sans ecraser une saisie faite
            # ailleurs ni obliger a repartir d'une base neuve.
            champs_remplis = [
                cle for cle, valeur in data["details"].items()
                if valeur is not None and getattr(deja_detail, cle) is None
            ]
            for cle in champs_remplis:
                setattr(deja_detail, cle, data["details"][cle])
            if champs_remplis:
                details_completes += 1
                print(f"    infos pratiques complétées : {nom} ({', '.join(champs_remplis)})")

        for beach_data in BEACHES:
            ajouter(beach_data, "Plage", BeachDetails, "point_of_interest_id")

        for hike_data in HIKES:
            ajouter(hike_data, "Randonnée", HikeDetails, "point_of_interest_id")

        # Les rhumeries n'ont pas de table de details : un simple PointOfInterest suffit.
        for rhumerie_data in RHUMERIES:
            ajouter(rhumerie_data, "Rhumerie", RumDistilleryDetails, "point_of_interest_id")

        db.commit()
        total = db.query(PointOfInterest).count()
        print(
            f"\n{ajouts} ajoutée(s), {ignores} déjà présente(s), "
            f"{details_ajoutes} fiche(s) de détails créée(s), "
            f"{details_completes} complétée(s). "
            f"{total} activités au total."
        )

    except Exception as e:
        db.rollback()
        print(f"Erreur lors du peuplement : {e}")
        raise
    finally:
        db.close()


if __name__ == "__main__":
    seed()