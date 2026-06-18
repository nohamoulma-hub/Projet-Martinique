# Point d'entrée de l'API : crée l'application FastAPI et assemble les routeurs.
# C'est ce fichier qu'uvicorn lance (uvicorn app.main:app).
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import settings
from app.routers import health

app = FastAPI(title=settings.app_name)

# CORS : autorise le frontend (servi depuis une autre origine/port) à appeler cette API.
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Chaque nouvelle fonctionnalité (plages, randos, météo...) aura son propre routeur
# dans app/routers/, à enregistrer ici avec include_router.
app.include_router(health.router)
