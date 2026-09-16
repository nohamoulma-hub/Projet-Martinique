# Point d'entrée de l'API : crée l'application FastAPI et assemble les routeurs.
# C'est ce fichier qu'uvicorn lance (uvicorn app.main:app).
from pathlib import Path

from fastapi import FastAPI, Request, status
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
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

# Libelles francais des champs, pour les messages d'erreur de validation.
LIBELLES_CHAMPS = {
    "email": "email",
    "password": "mot de passe",
    "first_name": "prénom",
    "last_name": "nom",
    "nationality": "nationalité",
    "age_range": "tranche d'âge",
    "name": "nom",
    "start_date": "date de début",
    "end_date": "date de fin",
}

# Prefixe que Pydantic ajoute aux ValueError levees par nos validateurs.
PREFIXE_VALUE_ERROR = "Value error, "


def message_validation(erreur: dict) -> str:
    """Traduit une erreur de validation Pydantic en une phrase en francais."""
    type_erreur = erreur.get("type", "")
    loc = erreur.get("loc", ())
    champ = str(loc[-1]) if loc else ""
    libelle = LIBELLES_CHAMPS.get(champ, champ)
    msg = erreur.get("msg", "")

    # Nos propres validateurs portent deja un message en francais : on le garde tel quel.
    if type_erreur == "value_error" and msg.startswith(PREFIXE_VALUE_ERROR):
        return msg[len(PREFIXE_VALUE_ERROR):]
    if champ == "email":
        return "L'adresse email n'est pas valide."
    if type_erreur == "missing":
        return f"Le champ « {libelle} » est obligatoire."
    if type_erreur == "json_invalid":
        return "Le corps de la requête n'est pas un JSON valide."
    if type_erreur == "enum":
        return f"Valeur non autorisée pour le champ « {libelle} »."
    return f"Le champ « {libelle} » n'est pas valide."


# FastAPI renvoie par defaut {"detail": [ {...}, ... ]}, une liste de messages en
# anglais. Le frontend lit detail comme une chaine : toute erreur de validation
# s'affichait donc "[object Object]". Le CLAUDE.md impose {"detail": "message en
# francais"} ; on renvoie la premiere erreur, qui suffit a guider la correction.
@app.exception_handler(RequestValidationError)
async def erreur_de_validation(request: Request, exc: RequestValidationError):
    erreurs = exc.errors()
    message = message_validation(erreurs[0]) if erreurs else "Données invalides."
    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        content={"detail": message},
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
