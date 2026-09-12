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


def seed():
    """Peuple la base de données avec des plages et randonnées de Martinique."""
    db = SessionLocal()
    try:
        # Vérification pour éviter un double-peuplement
        existing_count = db.query(PointOfInterest).count()
        if existing_count > 0:
            print(f"Base déjà peuplée ({existing_count} activités). Aucune action.")
            return

        print("Peuplement de la base de données...")

        for beach_data in BEACHES:
            poi = PointOfInterest(**beach_data["poi"])
            db.add(poi)
            db.flush()  # Obtenir l'id avant d'ajouter les détails
            details = BeachDetails(point_of_interest_id=poi.id, **beach_data["details"])
            db.add(details)
            print(f"  Plage ajoutée : {poi.name}")

        for hike_data in HIKES:
            poi = PointOfInterest(**hike_data["poi"])
            db.add(poi)
            db.flush()
            details = HikeDetails(point_of_interest_id=poi.id, **hike_data["details"])
            db.add(details)
            print(f"  Randonnée ajoutée : {poi.name}")

        db.commit()
        total = db.query(PointOfInterest).count()
        print(f"\nBase peuplée avec succes : {total} activités au total.")

    except Exception as e:
        db.rollback()
        print(f"Erreur lors du peuplement : {e}")
        raise
    finally:
        db.close()


if __name__ == "__main__":
    seed()