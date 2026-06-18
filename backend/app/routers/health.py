# Route de vérification : permet de tester rapidement que l'API tourne et répond,
# sans dépendre de la base de données ou d'une API externe. Utile pour le debug et le monitoring.
from fastapi import APIRouter

router = APIRouter(tags=["health"])


@router.get("/health")
def health_check():
    return {"status": "ok"}
