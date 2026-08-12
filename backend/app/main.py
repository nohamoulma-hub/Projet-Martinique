# Point d'entrée de l'API : crée l'application FastAPI et assemble les routeurs.
# C'est ce fichier qu'uvicorn lance (uvicorn app.main:app).
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import settings
from app.routers import activites, auth, health, meteo, projets, utilisateurs

app = FastAPI(
    title=settings.app_name,
    description="API du site touristique Martinique — catalogue d'activités, météo, projets de voyage.",
    version="1.0.0",
)

# CORS : autorise le frontend (servi depuis une autre origine/port) à appeler cette API.
# Ne pas utiliser allow_origins=["*"] en production : limiter aux origines connues.
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Enregistrement de tous les routeurs v1
app.include_router(health.router)
app.include_router(activites.router)
app.include_router(auth.router)
app.include_router(utilisateurs.router)
app.include_router(projets.router)
app.include_router(meteo.router)
