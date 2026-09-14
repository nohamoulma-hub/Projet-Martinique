# Point d'entrée de l'API : crée l'application FastAPI et assemble les routeurs.
# C'est ce fichier qu'uvicorn lance (uvicorn app.main:app).
from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.core.config import settings
from app.routers import activites, auth, health, meteo, projets, utilisateurs

# Toutes les routes API vivent sous /api. Un prefixe unique evite toute collision avec
# un fichier statique du site (une route /meteo et une page meteo.html, par exemple) et
# permet a nginx de n'avoir qu'une seule regle de proxy.
API_PREFIX = "/api"

app = FastAPI(
    title=settings.app_name,
    description="API du site touristique Martinique : catalogue d'activités, météo, projets de voyage.",
    version="1.0.0",
    docs_url=f"{API_PREFIX}/docs",
    redoc_url=f"{API_PREFIX}/redoc",
    openapi_url=f"{API_PREFIX}/openapi.json",
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

# Enregistrement de tous les routeurs v1, tous sous le prefixe /api
for routeur in (health, activites, auth, utilisateurs, projets, meteo):
    app.include_router(routeur.router, prefix=API_PREFIX)

# Sert le frontend statique depuis /site pour éviter les conflits avec les routes API
frontend_path = Path(__file__).parent.parent.parent / "frontend"
if frontend_path.exists():
    assets_path = frontend_path / "assets"
    if assets_path.exists():
        app.mount("/assets", StaticFiles(directory=str(assets_path)), name="assets")
    app.mount("/site", StaticFiles(directory=str(frontend_path), html=True), name="frontend")
