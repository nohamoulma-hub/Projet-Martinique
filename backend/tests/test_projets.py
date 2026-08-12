# Tests des endpoints /projets (CRUD projets de voyage + gestion des activités).
from app.models.point_of_interest import Category, PointOfInterest


def _register_and_login(client, email="voyageur@test.com"):
    """Inscrit un utilisateur et retourne son token JWT."""
    response = client.post("/auth/inscription", json={
        "first_name": "Paul",
        "last_name": "Martin",
        "email": email,
        "password": "motdepasse456",
    })
    return response.json()["access_token"]


def _auth_headers(token):
    """Retourne les headers avec le token JWT."""
    return {"Authorization": f"Bearer {token}"}


def _create_poi(db, name="Plage Test"):
    """Insère un point d'intérêt de test."""
    poi = PointOfInterest(
        name=name,
        category=Category.BEACH,
        description="Plage de test",
        latitude=14.6,
        longitude=-61.0,
    )
    db.add(poi)
    db.commit()
    db.refresh(poi)
    return poi


def test_creer_projet(client):
    """POST /projets crée un projet et le retourne."""
    token = _register_and_login(client, email="projet1@test.com")
    response = client.post("/projets", json={
        "name": "Mon voyage en Martinique",
        "start_date": "2026-12-20",
        "end_date": "2027-01-03",
    }, headers=_auth_headers(token))
    assert response.status_code == 201
    data = response.json()
    assert data["name"] == "Mon voyage en Martinique"
    assert data["start_date"] == "2026-12-20"
    assert data["items"] == []


def test_list_projets_vide(client):
    """GET /projets retourne une liste vide pour un nouvel utilisateur."""
    token = _register_and_login(client, email="liste@test.com")
    response = client.get("/projets", headers=_auth_headers(token))
    assert response.status_code == 200
    assert response.json() == []


def test_list_projets_only_own(client, db_session):
    """GET /projets ne retourne que les projets de l'utilisateur connecté."""
    token1 = _register_and_login(client, email="user1@test.com")
    token2 = _register_and_login(client, email="user2@test.com")

    # User1 crée un projet
    client.post("/projets", json={"name": "Projet User1"}, headers=_auth_headers(token1))

    # User2 ne voit pas le projet de User1
    response = client.get("/projets", headers=_auth_headers(token2))
    assert response.status_code == 200
    assert response.json() == []


def test_get_projet_detail(client):
    """GET /projets/{id} retourne le détail du projet."""
    token = _register_and_login(client, email="detail@test.com")
    create_resp = client.post("/projets", json={"name": "Rêve de vacances"}, headers=_auth_headers(token))
    projet_id = create_resp.json()["id"]

    response = client.get(f"/projets/{projet_id}", headers=_auth_headers(token))
    assert response.status_code == 200
    assert response.json()["name"] == "Rêve de vacances"


def test_get_projet_autre_utilisateur(client):
    """GET /projets/{id} retourne 404 si le projet appartient à un autre utilisateur."""
    token1 = _register_and_login(client, email="owner@test.com")
    token2 = _register_and_login(client, email="intrus@test.com")

    create_resp = client.post("/projets", json={"name": "Projet privé"}, headers=_auth_headers(token1))
    projet_id = create_resp.json()["id"]

    response = client.get(f"/projets/{projet_id}", headers=_auth_headers(token2))
    assert response.status_code == 404


def test_update_projet(client):
    """PUT /projets/{id} modifie les champs fournis."""
    token = _register_and_login(client, email="update_projet@test.com")
    create_resp = client.post("/projets", json={"name": "Ancien nom"}, headers=_auth_headers(token))
    projet_id = create_resp.json()["id"]

    response = client.put(f"/projets/{projet_id}", json={"name": "Nouveau nom"}, headers=_auth_headers(token))
    assert response.status_code == 200
    assert response.json()["name"] == "Nouveau nom"


def test_delete_projet(client):
    """DELETE /projets/{id} supprime le projet."""
    token = _register_and_login(client, email="delete_projet@test.com")
    create_resp = client.post("/projets", json={"name": "A supprimer"}, headers=_auth_headers(token))
    projet_id = create_resp.json()["id"]

    response = client.delete(f"/projets/{projet_id}", headers=_auth_headers(token))
    assert response.status_code == 204

    # Le projet n'existe plus
    get_response = client.get(f"/projets/{projet_id}", headers=_auth_headers(token))
    assert get_response.status_code == 404


def test_ajouter_activite_au_projet(client, db_session):
    """POST /projets/{id}/activites ajoute une activité du catalogue au projet."""
    poi = _create_poi(db_session, "Anse Céron")
    token = _register_and_login(client, email="add_activite@test.com")
    create_resp = client.post("/projets", json={"name": "Avec activités"}, headers=_auth_headers(token))
    projet_id = create_resp.json()["id"]

    response = client.post(f"/projets/{projet_id}/activites", json={
        "activity_id": poi.id,
        "day_number": 2,
    }, headers=_auth_headers(token))
    assert response.status_code == 201
    data = response.json()
    assert len(data["items"]) == 1
    assert data["items"][0]["activity"]["name"] == "Anse Céron"
    assert data["items"][0]["day_number"] == 2


def test_ajouter_activite_inexistante(client):
    """POST /projets/{id}/activites avec une activité inconnue retourne 404."""
    token = _register_and_login(client, email="act_inexist@test.com")
    create_resp = client.post("/projets", json={"name": "Projet test"}, headers=_auth_headers(token))
    projet_id = create_resp.json()["id"]

    response = client.post(f"/projets/{projet_id}/activites", json={
        "activity_id": 9999,
    }, headers=_auth_headers(token))
    assert response.status_code == 404
    assert "Activité introuvable" in response.json()["detail"]


def test_supprimer_activite_du_projet(client, db_session):
    """DELETE /projets/{id}/activites/{item_id} retire l'activité du projet."""
    poi = _create_poi(db_session, "Plage à retirer")
    token = _register_and_login(client, email="remove_act@test.com")

    create_resp = client.post("/projets", json={"name": "Projet retrait"}, headers=_auth_headers(token))
    projet_id = create_resp.json()["id"]

    add_resp = client.post(f"/projets/{projet_id}/activites", json={"activity_id": poi.id}, headers=_auth_headers(token))
    item_id = add_resp.json()["items"][0]["id"]

    response = client.delete(f"/projets/{projet_id}/activites/{item_id}", headers=_auth_headers(token))
    assert response.status_code == 204

    # L'item est bien retiré
    get_resp = client.get(f"/projets/{projet_id}", headers=_auth_headers(token))
    assert get_resp.json()["items"] == []


def test_projets_non_connecte(client):
    """GET /projets sans token retourne 403."""
    response = client.get("/projets")
    assert response.status_code in (401, 403)