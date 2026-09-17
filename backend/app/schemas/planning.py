# Définit la forme des données échangées avec l'assistant de planning.
from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class MessageRead(BaseModel):
    """Un message affiché dans la conversation."""
    id: int
    role: str
    content: str
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class ConversationRead(BaseModel):
    """Une conversation, telle que listée dans l'espace personnel."""
    id: int
    title: str | None
    travel_project_id: int | None
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class ConversationDetail(ConversationRead):
    """Une conversation avec ses messages, pour la rouvrir."""
    messages: list[MessageRead] = []
    # Messages encore disponibles avant la limite de la conversation
    messages_restants: int = 0


class MessageCreate(BaseModel):
    """Message envoyé par le voyageur."""
    # La longueur est bornée ici, donc avant tout appel au modèle
    content: str = Field(min_length=1, max_length=2000)


class ReponseAssistant(BaseModel):
    """Réponse de l'assistant à un message."""
    reply: str
    messages_restants: int
    travel_project_id: int | None = None
