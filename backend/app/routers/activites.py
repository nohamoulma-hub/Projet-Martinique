# Endpoints du catalogue d'activités : liste paginée et détail par id.
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.models.beach_details import BeachDetails
from app.models.hike_details import HikeDetails
from app.models.point_of_interest import Category, PointOfInterest
from app.schemas.point_of_interest import PointOfInterestDetail, PointOfInterestRead

router = APIRouter(prefix="/activites", tags=["activites"])

# Nombre maximum d'activités par page (spécification v1)
PAGE_SIZE = 20


@router.get("", response_model=dict, summary="Liste des activités")
def list_activites(
    categorie: Category | None = Query(None, description="Filtrer par catégorie"),
    search: str | None = Query(None, description="Recherche textuelle sur le nom"),
    page: int = Query(1, ge=1, description="Numéro de page"),
    sort: str = Query("nom", pattern="^(popularite|nom)$", description="Tri : 'nom' ou 'popularite'"),
    db: Session = Depends(get_db),
):
    """Retourne la liste paginée des activités avec filtres optionnels."""
    query = db.query(PointOfInterest)

    # Filtre par catégorie : v1 expose toutes les catégories mais seules plages et randos ont des détails
    if categorie:
        query = query.filter(PointOfInterest.category == categorie)

    # Recherche insensible à la casse sur le nom
    if search:
        query = query.filter(PointOfInterest.name.ilike(f"%{search}%"))

    # Tri : par défaut alphabétique, ou par score de fréquentation (plages uniquement)
    if sort == "nom":
        query = query.order_by(PointOfInterest.name)
    else:
        # Popularite : tri par id en fallback (le score est sur beach_details, pas sur poi)
        query = query.order_by(PointOfInterest.id)

    total = query.count()
    offset = (page - 1) * PAGE_SIZE
    items = query.offset(offset).limit(PAGE_SIZE).all()

    return {
        "items": [PointOfInterestRead.model_validate(item) for item in items],
        "total": total,
        "page": page,
        "has_more": (offset + PAGE_SIZE) < total,
    }


@router.get("/{activite_id}", response_model=PointOfInterestDetail, summary="Détail d'une activité")
def get_activite(activite_id: int, db: Session = Depends(get_db)):
    """Retourne le détail complet d'une activité avec ses informations spécifiques."""
    poi = db.get(PointOfInterest, activite_id)
    if poi is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Activité introuvable",
        )

    # Charge les détails spécifiques selon la catégorie
    beach = None
    hike = None
    if poi.category == Category.BEACH:
        beach = db.query(BeachDetails).filter(BeachDetails.point_of_interest_id == poi.id).first()
    elif poi.category == Category.HIKE:
        hike = db.query(HikeDetails).filter(HikeDetails.point_of_interest_id == poi.id).first()

    result = PointOfInterestDetail.model_validate(poi)
    result.beach_details = beach
    result.hike_details = hike
    return result