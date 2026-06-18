# Table pour connaitre les détails du projet

from app.core.database import Base
from sqlalchemy import ForeignKey, Integer, Enum, Column
import enum

class ItemStatus(str, enum.Enum):
    PLANNED = "planned"
    CONFIRMED = "confirmed"
    DONE = "done"


class TravelProjectItem(Base):
    """ Classe pour avoir les détails du voyage """

    __tablename__ = "travel_project_items"

    id = Column(Integer, primary_key=True)

    travel_project_id = Column(Integer, ForeignKey("travel_projects.id"), nullable=False)
    point_of_interest_id = Column(Integer, ForeignKey("points_of_interest.id"), nullable=False)

    day_number = Column(Integer, nullable=True)
    status = Column(Enum(ItemStatus), nullable=False)
    