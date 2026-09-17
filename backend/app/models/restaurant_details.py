# Table des informations pratiques des restaurants : cuisine, contact, distinction, hôtel.

from sqlalchemy import Column, ForeignKey, Integer, String

from app.core.database import Base


class RestaurantDetails(Base):
    """Informations pratiques propres à un restaurant.

    Table dédiée, comme beach_details, hike_details et rum_distillery_details : un
    restaurant a un type de cuisine et une distinction, une plage n'en a pas.

    Tous les champs sont facultatifs : les données viennent d'OpenStreetMap et des sites
    des établissements, qui ne documentent pas tout. Un champ vide s'affiche
    "Non renseigné" plutôt que d'être inventé.
    """

    __tablename__ = "restaurant_details"
    id = Column(Integer, primary_key=True)

    point_of_interest_id = Column(
        Integer, ForeignKey("points_of_interest.id"), unique=True, nullable=False
    )
    # Type de cuisine en clair, ex : "Créole", "Française, créole"
    cuisine = Column(String(120), nullable=True)
    # Horaires au format OpenStreetMap, ex : "Mo-Su 09:00-17:00"
    opening_hours = Column(String(200), nullable=True)
    phone = Column(String(30), nullable=True)
    website = Column(String(300), nullable=True)
    # None quand l'établissement n'a aucune distinction, ce qui est le cas de tous
    # aujourd'hui : le guide Michelin n'attribue pas d'étoile en Martinique. Une chaîne
    # plutôt qu'un booléen pour accueillir plus tard "1 étoile" ou "Bib Gourmand".
    michelin_distinction = Column(String(60), nullable=True)
    # Nom de l'hôtel quand le restaurant se trouve dans un établissement hôtelier
    hotel_name = Column(String(120), nullable=True)
