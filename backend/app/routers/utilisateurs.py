# Endpoints utilisateurs : profil de l'utilisateur connecté (lecture et modification).
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.models.user import User
from app.schemas.user import UserRead, UserUpdate
from app.services.auth_service import get_current_user

router = APIRouter(prefix="/utilisateurs", tags=["utilisateurs"])


@router.get("/moi", response_model=UserRead, summary="Mon profil")
def get_profil(current_user: User = Depends(get_current_user)):
    """Retourne le profil de l'utilisateur connecté."""
    return current_user


@router.put("/moi", response_model=UserRead, summary="Modifier mon profil")
def update_profil(
    body: UserUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Met à jour les champs fournis du profil. Les champs absents du corps ne sont pas modifiés."""
    # Seuls les champs non-None du corps sont appliqués
    update_data = body.model_dump(exclude_none=True)
    for field, value in update_data.items():
        setattr(current_user, field, value)
    db.commit()
    db.refresh(current_user)
    return current_user