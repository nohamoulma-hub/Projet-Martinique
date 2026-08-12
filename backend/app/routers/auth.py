# Endpoints d'authentification : inscription et connexion, retournent un token JWT.
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import create_access_token, hash_password, verify_password
from app.models.user import User
from app.schemas.auth import LoginRequest, Token
from app.schemas.user import UserCreate

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/inscription", response_model=Token, status_code=status.HTTP_201_CREATED, summary="Créer un compte")
def inscription(body: UserCreate, db: Session = Depends(get_db)):
    """Crée un nouvel utilisateur. Retourne un token JWT valide immédiatement."""
    # Vérification unicité de l'email avant insertion
    existing = db.query(User).filter(User.email == body.email).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email déjà utilisé",
        )
    user = User(
        first_name=body.first_name,
        last_name=body.last_name,
        email=body.email,
        hashed_password=hash_password(body.password),
        nationality=body.nationality,
        age_range=body.age_range,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    token = create_access_token({"sub": str(user.id)})
    return Token(access_token=token)


@router.post("/connexion", response_model=Token, summary="Se connecter")
def connexion(body: LoginRequest, db: Session = Depends(get_db)):
    """Vérifie les identifiants et retourne un token JWT si corrects."""
    user = db.query(User).filter(User.email == body.email).first()
    if user is None or not verify_password(body.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Email ou mot de passe incorrect",
        )
    token = create_access_token({"sub": str(user.id)})
    return Token(access_token=token)