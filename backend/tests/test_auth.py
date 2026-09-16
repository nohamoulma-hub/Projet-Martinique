# Tests des endpoints /auth (inscription, connexion) et /utilisateurs/moi.
import pytest

from app.core.security import hash_password, verify_password
from app.models.user import AgeRange, User


def _register(client, email="test@example.com", password="Motdepasse123"):
    """Inscrit un utilisateur et retourne le token."""
    response = client.post("/api/auth/inscription", json={
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
    _register(client, email="login@test.com", password="Secret123")
    response = client.post("/api/auth/connexion", json={
        "email": "login@test.com",
        "password": "Secret123",
    })
    assert response.status_code == 200
    data = response.json()
    assert "access_token" in data
    assert data["token_type"] == "bearer"


def test_connexion_mauvais_mot_de_passe(client):
    """POST /auth/connexion avec un mauvais mot de passe retourne 401."""
    inscription = _register(client, email="mdp@test.com", password="Correct123")
    # Sans cette assertion, un echec d'inscription ferait passer le test pour une
    # mauvaise raison : le compte n'existerait pas, et la connexion echouerait quand meme.
    assert inscription.status_code == 201
    response = client.post("/api/auth/connexion", json={
        "email": "mdp@test.com",
        "password": "faux",
    })
    assert response.status_code == 401
    assert "incorrect" in response.json()["detail"].lower()


def test_connexion_email_inconnu(client):
    """POST /auth/connexion avec un email inconnu retourne 401."""
    response = client.post("/api/auth/connexion", json={
        "email": "inconnu@test.com",
        "password": "motdepasse",
    })
    assert response.status_code == 401


def test_get_profil_connecte(client):
    """GET /utilisateurs/moi retourne le profil de l'utilisateur connecté."""
    reg_response = _register(client, email="profil@test.com")
    token = reg_response.json()["access_token"]

    response = client.get("/api/utilisateurs/moi", headers={"Authorization": f"Bearer {token}"})
    assert response.status_code == 200
    data = response.json()
    assert data["email"] == "profil@test.com"
    assert data["first_name"] == "Marie"
    assert "hashed_password" not in data


def test_get_profil_non_connecte(client):
    """GET /utilisateurs/moi sans token retourne 403."""
    response = client.get("/api/utilisateurs/moi")
    # HTTPBearer retourne 403 si aucun header n'est fourni
    assert response.status_code in (401, 403)


def test_get_profil_token_invalide(client):
    """GET /utilisateurs/moi avec un token invalide retourne 401."""
    response = client.get("/api/utilisateurs/moi", headers={"Authorization": "Bearer token_invalide"})
    assert response.status_code == 401


def test_update_profil(client):
    """PUT /utilisateurs/moi modifie les champs fournis."""
    reg_response = _register(client, email="update@test.com")
    token = reg_response.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    response = client.put("/api/utilisateurs/moi", json={"first_name": "Claire"}, headers=headers)
    assert response.status_code == 200
    assert response.json()["first_name"] == "Claire"
    # Les autres champs restent inchangés
    assert response.json()["last_name"] == "Dupont"

# --- Regles de mot de passe, appliquees cote serveur ---
# Avant la correction, ces regles n'existaient que dans le formulaire : un appel direct a
# l'API acceptait un mot de passe vide ou d'un caractere.

MOT_DE_PASSE_TROP_LONG = "A1" + "x" * 100  # 102 octets, au-dela de la limite de bcrypt


@pytest.mark.parametrize("password, extrait", [
    ("", "au moins 8 caractères"),
    ("a", "au moins 8 caractères"),
    ("Court1", "au moins 8 caractères"),
    ("motdepasse1", "une majuscule"),
    ("Motdepasse", "un chiffre"),
    # Aligne sur la regex /[A-Z]/ du formulaire : une majuscule accentuee ne compte pas
    ("élémentÉ123", "une majuscule"),
    (MOT_DE_PASSE_TROP_LONG, "72 octets"),
])
def test_inscription_mot_de_passe_refuse(client, password, extrait):
    """Un mot de passe non conforme est refuse en 422, avec un message en francais."""
    response = _register(client, email="regle@test.com", password=password)
    assert response.status_code == 422
    detail = response.json()["detail"]
    # Une chaine et non la liste par defaut de FastAPI : le frontend lit detail tel quel
    assert isinstance(detail, str)
    assert extrait in detail


def test_inscription_mot_de_passe_refuse_ne_cree_pas_de_compte(client):
    """Un refus de mot de passe ne laisse aucun compte derriere lui."""
    _register(client, email="fantome@test.com", password="a")
    # Si le compte existait, ce second essai avec un mot de passe valide echouerait en 400
    response = _register(client, email="fantome@test.com", password="Valide123")
    assert response.status_code == 201


def test_inscription_longueur_mesuree_en_octets(client):
    """La limite de 72 porte sur les octets : des lettres accentuees en prennent deux."""
    # 40 caracteres "é" font 80 octets : sous 72 caracteres, mais au-dela de 72 octets
    password = "A1" + "é" * 40
    assert len(password) < 72 < len(password.encode("utf-8"))
    response = _register(client, email="octets@test.com", password=password)
    assert response.status_code == 422
    assert "72 octets" in response.json()["detail"]


def test_connexion_mot_de_passe_trop_long_ne_provoque_pas_500(client):
    """Un mot de passe de plus de 72 octets est refuse proprement a la connexion.

    bcrypt 5 leve ValueError au-dela de 72 octets : sans controle, la route publique de
    connexion renvoyait une erreur 500, declenchable par n'importe qui sans compte.
    """
    response = client.post("/api/auth/connexion", json={
        "email": "nimporte@qui.com",
        "password": MOT_DE_PASSE_TROP_LONG,
    })
    assert response.status_code == 422
    assert "72 octets" in response.json()["detail"]


def test_connexion_n_impose_pas_la_complexite(client, db_session):
    """Un compte cree avant l'ajout des regles doit pouvoir se connecter.

    On insere directement un mot de passe faible, comme le permettait l'ancienne API :
    la connexion ne doit controler que la longueur, jamais la complexite.
    """
    db_session.add(User(
        first_name="Ancien", last_name="Compte", email="ancien@test.com",
        hashed_password=hash_password("faible"),
        nationality="Non renseignée", age_range=AgeRange.R26_35,
    ))
    db_session.commit()
    response = client.post("/api/auth/connexion", json={
        "email": "ancien@test.com",
        "password": "faible",
    })
    assert response.status_code == 200


def test_verify_password_trop_long_retourne_false():
    """Filet de securite : verify_password ne leve jamais, meme sans validation amont."""
    hache = hash_password("Valide123")
    assert verify_password(MOT_DE_PASSE_TROP_LONG, hache) is False
    assert verify_password("Valide123", hache) is True


# --- Format des erreurs de validation ---

def test_erreur_validation_email_en_francais(client):
    """Un email invalide renvoie un message en francais, sous forme de chaine."""
    response = _register(client, email="pas-un-email", password="Valide123")
    assert response.status_code == 422
    assert response.json()["detail"] == "L'adresse email n'est pas valide."


def test_erreur_validation_champ_manquant(client):
    """Un champ obligatoire absent est nomme en francais."""
    response = client.post("/api/auth/inscription", json={
        "email": "manque@test.com", "password": "Valide123",
    })
    assert response.status_code == 422
    assert response.json()["detail"] == "Le champ « prénom » est obligatoire."


def test_erreur_validation_json_invalide(client):
    """Un corps qui n'est pas du JSON renvoie un message explicite."""
    response = client.post(
        "/api/auth/inscription",
        content="pas du json",
        headers={"Content-Type": "application/json"},
    )
    assert response.status_code == 422
    assert "JSON" in response.json()["detail"]
