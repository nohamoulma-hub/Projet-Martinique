# Endpoints des projets de voyage : CRUD complet + ajout/suppression d'activités.
# Routes protégées : JWT requis. Un utilisateur ne peut accéder qu'à ses propres projets.
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.models.point_of_interest import PointOfInterest
from app.models.travel_project import TravelProject
from app.models.travel_project_item import ItemStatus, TravelProjectItem
from app.models.user import User
from app.schemas.point_of_interest import PointOfInterestRead
from app.schemas.travel_project import (
    TravelProjectCreate,
    TravelProjectItemCreate,
    TravelProjectItemRead,
    TravelProjectRead,
    TravelProjectUpdate,
)
from app.services.auth_service import get_current_user

router = APIRouter(prefix="/projets", tags=["projets"])


def _build_project_read(project: TravelProject, db: Session) -> TravelProjectRead:
    """Construit un TravelProjectRead en chargeant les items et leurs activités.
    Mapping : project.title -> name, item.point_of_interest_id -> activity_id."""
    items_orm = (
        db.query(TravelProjectItem)
        .filter(TravelProjectItem.travel_project_id == project.id)
        .all()
    )
    items_read = []
    for item in items_orm:
        poi = db.get(PointOfInterest, item.point_of_interest_id)
        if poi:
            items_read.append(
                TravelProjectItemRead(
                    id=item.id,
                    activity_id=item.point_of_interest_id,
                    day_number=item.day_number,
                    activity=PointOfInterestRead.model_validate(poi),
                )
            )
    return TravelProjectRead(
        id=project.id,
        name=project.title,
        start_date=project.start_date,
        end_date=project.end_date,
        budget=project.budget,
        created_at=project.created_at,
        items=items_read,
    )


@router.post("", response_model=TravelProjectRead, status_code=status.HTTP_201_CREATED, summary="Créer un projet")
def create_projet(
    body: TravelProjectCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Crée un nouveau projet de voyage pour l'utilisateur connecté."""
    project = TravelProject(
        user_id=current_user.id,
        title=body.name,
        start_date=body.start_date,
        end_date=body.end_date,
        budget=body.budget,
    )
    db.add(project)
    db.commit()
    db.refresh(project)
    return _build_project_read(project, db)


@router.get("", response_model=list[TravelProjectRead], summary="Mes projets")
def list_projets(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Retourne tous les projets de voyage de l'utilisateur connecté."""
    projects = db.query(TravelProject).filter(TravelProject.user_id == current_user.id).all()
    return [_build_project_read(p, db) for p in projects]


@router.get("/{projet_id}", response_model=TravelProjectRead, summary="Détail d'un projet")
def get_projet(
    projet_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Retourne le détail d'un projet avec ses activités planifiées."""
    project = db.get(TravelProject, projet_id)
    if project is None or project.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Projet introuvable",
        )
    return _build_project_read(project, db)


@router.put("/{projet_id}", response_model=TravelProjectRead, summary="Modifier un projet")
def update_projet(
    projet_id: int,
    body: TravelProjectUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Met à jour les champs fournis d'un projet. Les champs absents ne sont pas modifiés."""
    project = db.get(TravelProject, projet_id)
    if project is None or project.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Projet introuvable",
        )
    update_data = body.model_dump(exclude_none=True)
    # "name" dans le schéma correspond à "title" dans le modèle
    if "name" in update_data:
        project.title = update_data.pop("name")
    for field, value in update_data.items():
        setattr(project, field, value)
    db.commit()
    db.refresh(project)
    return _build_project_read(project, db)


@router.delete("/{projet_id}", status_code=status.HTTP_204_NO_CONTENT, summary="Supprimer un projet")
def delete_projet(
    projet_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Supprime un projet et tous ses items associés."""
    project = db.get(TravelProject, projet_id)
    if project is None or project.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Projet introuvable",
        )
    # Suppression des items avant le projet (pas de cascade définie sur le modèle)
    db.query(TravelProjectItem).filter(TravelProjectItem.travel_project_id == projet_id).delete()
    db.delete(project)
    db.commit()


@router.post("/{projet_id}/activites", response_model=TravelProjectRead, status_code=status.HTTP_201_CREATED, summary="Ajouter une activité au projet")
def add_activite(
    projet_id: int,
    body: TravelProjectItemCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Ajoute une activité du catalogue au projet de voyage."""
    project = db.get(TravelProject, projet_id)
    if project is None or project.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Projet introuvable",
        )
    poi = db.get(PointOfInterest, body.activity_id)
    if poi is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Activité introuvable",
        )
    item = TravelProjectItem(
        travel_project_id=projet_id,
        point_of_interest_id=body.activity_id,
        day_number=body.day_number,
        status=ItemStatus.PLANNED,
    )
    db.add(item)
    db.commit()
    return _build_project_read(project, db)


@router.delete("/{projet_id}/activites/{item_id}", status_code=status.HTTP_204_NO_CONTENT, summary="Retirer une activité du projet")
def remove_activite(
    projet_id: int,
    item_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Retire une activité planifiée du projet de voyage."""
    project = db.get(TravelProject, projet_id)
    if project is None or project.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Projet introuvable",
        )
    item = db.query(TravelProjectItem).filter(
        TravelProjectItem.id == item_id,
        TravelProjectItem.travel_project_id == projet_id,
    ).first()
    if item is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Activité introuvable dans ce projet",
        )
    db.delete(item)
    db.commit()