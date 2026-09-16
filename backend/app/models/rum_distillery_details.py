# Table des informations pratiques des rhumeries : horaires, contact, accès.

from sqlalchemy import Boolean, Column, ForeignKey, Integer, String, Text

from app.core.database import Base


class RumDistilleryDetails(Base):
    """Informations pratiques propres à une rhumerie.

    Nouvelle table plutôt que des colonnes sur points_of_interest : une plage n'a pas
    d'horaires d'ouverture et une rhumerie n'a pas de dénivelé. C'est le même choix que
    pour beach_details et hike_details.

    Tous les champs sont facultatifs : la plupart viennent d'OpenStreetMap, qui ne les
    documente pas pour toutes les distilleries. Un champ vide s'affiche "Non renseigné"
    plutôt que d'être inventé.
    """

    __tablename__ = "rum_distillery_details"
    id = Column(Integer, primary_key=True)

    point_of_interest_id = Column(
        Integer, ForeignKey("points_of_interest.id"), unique=True, nullable=False
    )
    # Fréquentation de 0 à 5, même échelle que les plages
    tourist_score = Column(Integer, nullable=True)
    # Horaires au format OpenStreetMap, ex : "Mo-Su 09:00-17:00"
    opening_hours = Column(String(200), nullable=True)
    # Numéro au format international
    phone = Column(String(30), nullable=True)
    website = Column(String(300), nullable=True)
    # Conditions d'accès : visite libre, guidée, sur réservation, tarif...
    visit_access = Column(Text, nullable=True)
    # None quand l'information n'est pas connue, ce qui n'est pas la même chose que False
    pets_allowed = Column(Boolean, nullable=True)
