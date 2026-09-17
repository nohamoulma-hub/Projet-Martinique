# Tables des conversations avec l'assistant de planning : suivi des échanges et des coûts.

from sqlalchemy import Column, DateTime, Float, ForeignKey, Integer, String, Text
from sqlalchemy.sql import func

from app.core.database import Base


class Conversation(Base):
    """Une conversation entre un utilisateur et l'assistant de planning.

    Conservée pour que l'utilisateur retrouve son historique depuis son espace personnel,
    et pour compter les conversations du jour et le coût réel de chacune.
    """

    __tablename__ = "conversations"

    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)

    title = Column(String(120), nullable=True)
    # Projet de voyage créé par l'assistant pendant la conversation, s'il y en a un
    travel_project_id = Column(Integer, ForeignKey("travel_projects.id"), nullable=True)
    # Coût cumulé des appels au modèle, en euros. Sert au plafond de dépense global.
    cost_eur = Column(Float, nullable=False, server_default="0")

    created_at = Column(DateTime, server_default=func.now(), nullable=False)
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now(), nullable=False)


class ConversationMessage(Base):
    """Un message de la conversation, côté utilisateur ou côté assistant.

    Le contenu des appels d'outils n'est pas stocké : seul le texte affiché à l'écran
    l'est, ce qui suffit à rejouer la conversation dans l'interface.
    """

    __tablename__ = "conversation_messages"

    id = Column(Integer, primary_key=True)
    conversation_id = Column(Integer, ForeignKey("conversations.id"), nullable=False)

    # "user" ou "assistant", les deux seuls rôles affichés
    role = Column(String(20), nullable=False)
    content = Column(Text, nullable=False)

    created_at = Column(DateTime, server_default=func.now(), nullable=False)
