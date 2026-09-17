"""Endpoints de l'assistant de planning. Toutes les routes exigent une connexion :
chaque message coûte de l'argent, et le planning produit appartient à un compte."""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.models.conversation import Conversation, ConversationMessage
from app.models.user import User
from app.schemas.planning import (
    ConversationDetail,
    ConversationRead,
    MessageCreate,
    ReponseAssistant,
)
from app.services import planning_service
from app.services.auth_service import get_current_user

router = APIRouter(prefix="/planning", tags=["planning"])


def _conversation_de_l_utilisateur(db: Session, conversation_id: int, user: User) -> Conversation:
    """Récupère la conversation en vérifiant qu'elle appartient bien à l'utilisateur."""
    conversation = db.get(Conversation, conversation_id)
    # Même réponse qu'une conversation inexistante : ne pas révéler l'existence de
    # la conversation d'un autre compte.
    if conversation is None or conversation.user_id != user.id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Conversation introuvable",
        )
    return conversation


def _messages_restants(db: Session, conversation: Conversation) -> int:
    envoyes = (
        db.query(ConversationMessage)
        .filter(ConversationMessage.conversation_id == conversation.id,
                ConversationMessage.role == "user")
        .count()
    )
    return max(0, planning_service.MAX_MESSAGES_PAR_CONVERSATION - envoyes)


@router.get("/accueil", response_model=dict, summary="Message d'accueil de l'assistant")
def message_accueil():
    """Texte affiché avant le premier message : ce qu'il faut fournir pour un bon planning."""
    return {"message": planning_service.MESSAGE_ACCUEIL,
            "max_messages": planning_service.MAX_MESSAGES_PAR_CONVERSATION,
            "max_conversations_par_jour": planning_service.MAX_CONVERSATIONS_PAR_JOUR}


@router.get("/conversations", response_model=list[ConversationRead],
            summary="Historique des conversations")
def lister_conversations(db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    """Les conversations de l'utilisateur, de la plus récente à la plus ancienne."""
    return (
        db.query(Conversation)
        .filter(Conversation.user_id == user.id)
        .order_by(Conversation.updated_at.desc())
        .all()
    )


@router.post("/conversations", response_model=ConversationDetail,
             status_code=status.HTTP_201_CREATED, summary="Ouvrir une conversation")
def creer_conversation(db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    """Ouvre une conversation, dans la limite du nombre autorisé par jour."""
    if planning_service.conversations_du_jour(db, user.id) >= planning_service.MAX_CONVERSATIONS_PAR_JOUR:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail=(f"Vous avez atteint la limite de "
                    f"{planning_service.MAX_CONVERSATIONS_PAR_JOUR} conversations par jour. "
                    "Vos plannings déjà enregistrés restent disponibles dans votre espace "
                    "personnel, et vous pourrez reprendre demain."),
        )

    conversation = Conversation(user_id=user.id)
    db.add(conversation)
    db.commit()
    db.refresh(conversation)
    return ConversationDetail(
        **ConversationRead.model_validate(conversation).model_dump(),
        messages=[], messages_restants=planning_service.MAX_MESSAGES_PAR_CONVERSATION,
    )


@router.get("/conversations/{conversation_id}", response_model=ConversationDetail,
            summary="Relire une conversation")
def lire_conversation(conversation_id: int, db: Session = Depends(get_db),
                      user: User = Depends(get_current_user)):
    """Renvoie une conversation et ses messages, pour la rouvrir depuis l'espace personnel."""
    conversation = _conversation_de_l_utilisateur(db, conversation_id, user)
    messages = (
        db.query(ConversationMessage)
        .filter(ConversationMessage.conversation_id == conversation.id)
        .order_by(ConversationMessage.id)
        .all()
    )
    return ConversationDetail(
        **ConversationRead.model_validate(conversation).model_dump(),
        messages=messages,
        messages_restants=_messages_restants(db, conversation),
    )


@router.post("/conversations/{conversation_id}/messages", response_model=ReponseAssistant,
             summary="Envoyer un message à l'assistant")
def envoyer_message(conversation_id: int, corps: MessageCreate,
                    db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    """Transmet le message à l'assistant après les contrôles de volume et de dépense."""
    conversation = _conversation_de_l_utilisateur(db, conversation_id, user)

    restants = _messages_restants(db, conversation)
    if restants <= 0:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail=("Cette conversation a atteint sa limite de messages, fixée pour des "
                    "raisons de sécurité. Votre planning enregistré reste disponible dans "
                    "votre espace personnel. Vous pouvez ouvrir une nouvelle conversation."),
        )

    # Délai entre deux messages, appliqué côté serveur pour ne pas être contournable
    attente = planning_service.attente_restante(db, user.id)
    if attente > 0:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail=f"Merci de patienter {int(attente) + 1} seconde(s) avant le message suivant.",
        )

    # Plafond de dépense pour tout le site : le service se coupe avant de dériver
    if planning_service.depense_totale_eur(db) >= planning_service.PLAFOND_DEPENSE_EUR:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=("L'assistant est momentanément indisponible : le budget de fonctionnement "
                    "du service est atteint. Vos plannings enregistrés restent accessibles."),
        )

    db.add(ConversationMessage(conversation_id=conversation.id, role="user",
                               content=corps.content))
    db.commit()

    try:
        resultat = planning_service.repondre(db, conversation, user.id, corps.content)
    except RuntimeError as erreur:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="L'assistant n'est pas configuré sur ce serveur.",
        ) from erreur
    except Exception as erreur:  # panne réseau ou API indisponible
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="L'assistant est momentanément indisponible. Réessayez dans un instant.",
        ) from erreur

    db.add(ConversationMessage(conversation_id=conversation.id, role="assistant",
                               content=resultat["texte"]))
    conversation.cost_eur = (conversation.cost_eur or 0) + resultat["cout_eur"]
    if resultat["projet_id"]:
        conversation.travel_project_id = resultat["projet_id"]
    # Le titre reprend le premier message du voyageur, pour s'y retrouver dans l'historique
    if not conversation.title:
        conversation.title = corps.content[:117] + ("..." if len(corps.content) > 117 else "")
    db.commit()

    return ReponseAssistant(
        reply=resultat["texte"],
        messages_restants=_messages_restants(db, conversation),
        travel_project_id=conversation.travel_project_id,
    )
