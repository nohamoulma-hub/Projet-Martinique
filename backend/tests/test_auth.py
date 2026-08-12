# Tests des endpoints /auth (inscription, connexion) et /utilisateurs/moi.


def _register(client, email="test@example.com", password="motdepasse123"):
    """Inscrit un utilisateur et retourne le token."""
    response = client.post("/auth/inscription", json={
        "first_name": "Marie",
        "last_name": "Dupont",
        "email": email,
        "password": password,
    })
    return response


def test_inscription_success(client):
    """POST /auth/inscription crée un compte et retourne un token JWT."""
    response = _register(client)
    assert response.status_code == 201
    data = response.json()
    assert "access_token" in data
    assert data["token_type"] == "bearer"
    assert len(data["access_token"]) > 20


def test_inscription_email_deja_utilise(client):
    """POST /auth/inscription avec un email déjà pris retourne 400."""
    _register(client, email="deja@pris.com")
    response = _register(client, email="deja@pris.com")
    assert response.status_code == 400
    assert "déjà utilisé" in response.json()["detail"]


def test_connexion_success(client):
    """POST /auth/connexion avec les bons identifiants retourne un token JWT."""
    _register(client, email="login@test.com", password="secret123")
    response = client.post("/auth/connexion", json={
        "email": "login@test.com",
        "password": "secret123",
    })
    assert response.status_code == 200
    data = response.json()
    assert "access_token" in data
    assert data["token_type"] == "bearer"


def test_connexion_mauvais_mot_de_passe(client):
    """POST /auth/connexion avec un mauvais mot de passe retourne 401."""
    _register(client, email="mdp@test.com", password="correct")
    response = client.post("/auth/connexion", json={
        "email": "mdp@test.com",
        "password": "faux",
    })
    assert response.status_code == 401
    assert "incorrect" in response.json()["detail"].lower()


def test_connexion_email_inconnu(client):
    """POST /auth/connexion avec un email inconnu retourne 401."""
    response = client.post("/auth/connexion", json={
        "email": "inconnu@test.com",
        "password": "motdepasse",
    })
    assert response.status_code == 401


def test_get_profil_connecte(client):
    """GET /utilisateurs/moi retourne le profil de l'utilisateur connecté."""
    reg_response = _register(client, email="profil@test.com")
    token = reg_response.json()["access_token"]

    response = client.get("/utilisateurs/moi", headers={"Authorization": f"Bearer {token}"})
    assert response.status_code == 200
    data = response.json()
    assert data["email"] == "profil@test.com"
    assert data["first_name"] == "Marie"
    assert "hashed_password" not in data


def test_get_profil_non_connecte(client):
    """GET /utilisateurs/moi sans token retourne 403."""
    response = client.get("/utilisateurs/moi")
    # HTTPBearer retourne 403 si aucun header n'est fourni
    assert response.status_code in (401, 403)


def test_get_profil_token_invalide(client):
    """GET /utilisateurs/moi avec un token invalide retourne 401."""
    response = client.get("/utilisateurs/moi", headers={"Authorization": "Bearer token_invalide"})
    assert response.status_code == 401


def test_update_profil(client):
    """PUT /utilisateurs/moi modifie les champs fournis."""
    reg_response = _register(client, email="update@test.com")
    token = reg_response.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    response = client.put("/utilisateurs/moi", json={"first_name": "Claire"}, headers=headers)
    assert response.status_code == 200
    assert response.json()["first_name"] == "Claire"
    # Les autres champs restent inchangés
    assert response.json()["last_name"] == "Dupont"