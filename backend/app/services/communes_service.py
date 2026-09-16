# Communes de Martinique et calcul de distance, pour le filtre "Par commune" du catalogue.
import math

# Coordonnées (latitude, longitude) de la mairie de chaque commune, source officielle
# geo.api.gouv.fr (codeDepartement=972). La mairie plutôt que le centre géométrique :
# c'est le bourg, là où le voyageur se repère.
COMMUNES = {
    "Basse-Pointe": (14.8685, -61.1201),
    "Bellefontaine": (14.6737, -61.1644),
    "Case-Pilote": (14.6432, -61.1390),
    "Ducos": (14.5759, -60.9758),
    "Fonds-Saint-Denis": (14.7389, -61.1325),
    "Fort-de-France": (14.6072, -61.0695),
    "Grand'Rivière": (14.8735, -61.1814),
    "Gros-Morne": (14.7103, -61.0048),
    "L'Ajoupa-Bouillon": (14.8248, -61.1145),
    "La Trinité": (14.7386, -60.9632),
    "Le Carbet": (14.7121, -61.1832),
    "Le Diamant": (14.4801, -61.0254),
    "Le François": (14.6154, -60.9028),
    "Le Lamentin": (14.6154, -61.0035),
    "Le Lorrain": (14.8327, -61.0556),
    "Le Marigot": (14.8215, -61.0282),
    "Le Marin": (14.4714, -60.8707),
    "Le Morne-Rouge": (14.7728, -61.1348),
    "Le Morne-Vert": (14.7075, -61.1443),
    "Le Prêcheur": (14.8012, -61.2246),
    "Le Robert": (14.6776, -60.9392),
    "Le Vauclin": (14.5451, -60.8400),
    "Les Anses-d'Arlet": (14.4911, -61.0801),
    "Les Trois-Îlets": (14.5393, -61.0337),
    "Macouba": (14.8762, -61.1450),
    "Rivière-Pilote": (14.4867, -60.9033),
    "Rivière-Salée": (14.5241, -60.9749),
    "Saint-Esprit": (14.5606, -60.9372),
    "Saint-Joseph": (14.6702, -61.0395),
    "Saint-Pierre": (14.7431, -61.1751),
    "Sainte-Anne": (14.4350, -60.8812),
    "Sainte-Luce": (14.4683, -60.9216),
    "Sainte-Marie": (14.7814, -60.9935),
    "Schœlcher": (14.6160, -61.1013),
}

RAYON_TERRE_KM = 6371.0
# Longueur d'un degré de latitude, pour le préfiltre rectangulaire
KM_PAR_DEGRE = 111.32


# Distance à vol d'oiseau entre deux points GPS, formule de haversine
def distance_km(lat1, lon1, lat2, lon2):
    phi1, phi2 = math.radians(lat1), math.radians(lat2)
    d_phi = phi2 - phi1
    d_lambda = math.radians(lon2 - lon1)
    a = math.sin(d_phi / 2) ** 2 + math.cos(phi1) * math.cos(phi2) * math.sin(d_lambda / 2) ** 2
    return 2 * RAYON_TERRE_KM * math.asin(math.sqrt(a))


# Rectangle qui contient le cercle de recherche : sert à écarter en SQL les points
# manifestement trop loin, avant le calcul exact fait en Python
def rectangle_englobant(lat, lon, rayon_km):
    d_lat = rayon_km / KM_PAR_DEGRE
    d_lon = rayon_km / (KM_PAR_DEGRE * math.cos(math.radians(lat)))
    return lat - d_lat, lat + d_lat, lon - d_lon, lon + d_lon
