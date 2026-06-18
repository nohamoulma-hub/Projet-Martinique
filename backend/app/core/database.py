# Connexion à la base de données : tout ce qui est ici est de la "tuyauterie" SQLAlchemy,
# utilisée par tous les modèles (app/models/) sans jamais être dupliquée.
from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker

from app.core.config import settings

# L'engine gère la connexion physique à la base (le fichier SQLite ici).
# check_same_thread=False : nécessaire avec SQLite car FastAPI peut traiter une requête
# dans un thread différent de celui qui a ouvert la connexion.
engine = create_engine(
    settings.database_url,
    connect_args={"check_same_thread": False},
)

# Chaque requête HTTP aura sa propre "session" : c'est l'objet utilisé pour lire/écrire
# des lignes en base (SELECT, INSERT, UPDATE...) avant de valider (commit) ou annuler (rollback).
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Base est la classe dont hériteront tous les modèles (User, PointOfInterest...).
# SQLAlchemy s'en sert pour savoir quelles classes correspondent à quelles tables.
Base = declarative_base()


def get_db():
    """Dépendance FastAPI : ouvre une session pour la durée d'une requête, puis la ferme.
    Utilisation dans un routeur : def ma_route(db: Session = Depends(get_db))."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
