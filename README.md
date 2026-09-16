# Projet Martinique

Site web touristique dédié à la Martinique, conçu pour aider les voyageurs à planifier leur séjour sur l'île. Interface pensée pour tous les profils de voyageurs, avec un accès rapide aux activités, à la météo et à la gestion de projets de voyage personnalisés.

---

## Stack technique

- **Frontend** : HTML, CSS, JavaScript vanilla (aucun framework)
- **Backend** : Python + FastAPI
- **ORM** : SQLAlchemy
- **Migrations** : Alembic
- **Base de données** : SQLite (développement) -> PostgreSQL (production)

---

## Lancer le projet

### Avec Docker (recommandé)

Trois conteneurs : `martinique-frontend` (nginx), `martinique-backend` (FastAPI) et `martinique-db` (PostgreSQL).

```bash
# Créer le fichier de secrets à partir du modèle, puis l'adapter
cp .env.example .env

# Construire et démarrer les trois conteneurs
docker compose up --build
```

Le site est accessible sur `http://localhost:8080`  
La documentation API (Swagger) sur `http://localhost:8080/api/docs`

Au premier démarrage, la base est vide. Pour la peupler :

```bash
docker compose exec backend python scripts/seed.py
docker compose exec backend python scripts/update_images.py
docker compose exec backend python scripts/seed_gallery.py
```

Les migrations Alembic sont appliquées automatiquement à chaque démarrage du backend.

### Environnement de développement : conteneur avec Docker-in-Docker

Le développement se fait dans un conteneur qui contient lui-même Docker, ce qui permet d'y
lancer les trois conteneurs de l'application. Il y a donc **deux daemons Docker distincts** :

```
Mac (daemon 1)
└── conteneur de dev (--privileged)
      └── daemon 2 (Docker-in-Docker)
            ├── martinique-db
            ├── martinique-backend
            └── martinique-frontend
```

Depuis l'intérieur du conteneur de dev, `docker` s'adresse **toujours au daemon 2**. Les
commandes visant le conteneur de dev lui-même sont à lancer depuis un terminal du Mac.

#### Créer le conteneur de dev

Le plus simple est VS Code : `Cmd+Shift+P` puis **Dev Containers: Reopen in Container**, qui
applique `.devcontainer/devcontainer.json` et installe Docker automatiquement.

En ligne de commande depuis le Mac :

```bash
docker run -d --privileged --name martinique-dev \
  -p 8080:8080 -p 8000:8000 \
  -v martinique-docker:/var/lib/docker \
  mcr.microsoft.com/devcontainers/base:ubuntu-24.04 sleep infinity
```

`--privileged` est obligatoire pour le daemon imbriqué et **ne s'ajoute pas à chaud**. Le
transfert des ports 8080 et 8000 est indispensable, sinon les conteneurs de l'application
tournent sans être joignables depuis le navigateur du Mac.

#### Installer Docker dedans (inutile via VS Code)

```bash
curl -fsSL https://get.docker.com | sudo sh
sudo usermod -aG docker vscode
sudo service docker start
newgrp docker
```

#### À chaque nouvelle session dans le conteneur

Il n'y a pas de systemd, donc le daemon ne redémarre pas seul :

```bash
sudo service docker start   # si "Cannot connect to the Docker daemon"
newgrp docker               # si "permission denied ... docker.sock"
```

`newgrp` ne vaut que pour le shell courant et conserve le même prompt : vérifier avec
`id -nG`, qui doit contenir `docker`.

### Dépannage

| Symptôme | Cause |
|---|---|
| `permission denied ... docker.sock` | `newgrp docker` non fait dans ce shell |
| `Cannot connect to the Docker daemon` | Daemon arrêté : `sudo service docker start` |
| `no configuration file provided` | Pas dans le dossier du projet |
| `container martinique-db is unhealthy` | Volume dans un état invalide : `docker compose down -v` |
| 502 après un redémarrage du backend | Devrait être couvert par le `resolver` de nginx.conf |
| Page affichée sans CSS sous Safari | `Cmd+Shift+R` active le mode Lecteur. Le rechargement forcé est `Cmd+Option+R` |

### Sans Docker (backend seul, sur SQLite)

```bash
source backend/venv/bin/activate
cd backend
# Basculer DATABASE_URL sur sqlite:///./martinique.db dans backend/.env
uvicorn app.main:app --reload --port 8000
```

Le frontend est alors servi sur `http://localhost:8000/site/accueil.html`

---

## Ce qui est en place

### Backend

- 6 modèles SQLAlchemy : `User`, `PointOfInterest`, `BeachDetails`, `HikeDetails`, `TravelProject`, `TravelProjectItem`
- Modèle `PoiImage` pour les galeries photos (table `poi_images`)
- 18 routes API :
  - `GET /health`
  - `GET /api/activites` (pagination, filtres catégorie/recherche/tri)
  - `GET /api/activites/{id}` (détail + beach_details ou hike_details + galerie photos)
  - `POST /api/auth/inscription` et `POST /api/auth/connexion` (JWT)
  - `GET /api/utilisateurs/moi` et `PUT /api/utilisateurs/moi` (protégées)
  - `GET/POST/PUT/DELETE /api/projets` et `POST/DELETE /api/projets/{id}/activites` (protégées)
  - `GET /api/meteo` (données en direct via Open-Meteo, coordonnées Fort-de-France)
- Authentification JWT avec hachage bcrypt
- 29 tests (pytest + httpx), tous verts
- Fichiers statiques servis via FastAPI : `/site` pour le frontend, `/assets` pour les photos locales

### Données

- **15 activités** en base : 8 plages + 7 randonnées (coordonnées GPS réelles, détails complets)
- **1 activité supplémentaire** : Anse Couleuvre (plage sauvage, Le Prêcheur)
- **Photos réelles** associées à 3 activités (galerie multi-photos) :
  - Anse Noire : 2 photos
  - Anse Dufour : 4 photos
  - Anse Couleuvre : 4 photos
- Photos de couverture (image principale) pour 14 activités sur 16

### Frontend

- **8 pages** avec design system "Madras" (palette rouge/jaune/vert/bleu/sable/nuit, Playfair Display + DM Sans)
- Navigation unifiée sur toutes les pages : état connecté/déconnecté, bulle d'initiales avec menu déroulant, barre de progression madras
- `accueil.html` : hero, catalogue des rubriques avec photos et liens filtrés vers le catalogue, section météo live, stat pills
- `catalogue.html` : liste dynamique depuis l'API, filtres par catégorie, recherche textuelle (debounce), tri, pagination, activation automatique du filtre depuis l'URL (`?filtre=plages`, `?filtre=randonnees`, etc.)
- `detail.html` : fiche complète de l'activité, galerie photos avec lightbox (animations, navigation, fermeture Echap), hero photo de couverture, fiche pratique sidebar dynamique, bouton "Ajouter à mon voyage" avec modale de sélection de projet
- `meteo.html` : données en direct depuis l'API
- `auth.html` : connexion / inscription avec validation côté client
- `espace-personnel.html` : tableau de bord protégé, liste des projets, création de projet
- `detail-voyage.html` : détail d'un projet avec activités groupées par jour, ajout/retrait d'activités
- `planning-ia.html` : interface chat (fonctionnalité IA à venir)

---

## Ce qu'il reste à faire

### Fonctionnalités v2 (prioritaires)

- [x] Filtre par commune dans le catalogue, avec rayon de recherche de 5 à 50 km
- [ ] Carte interactive des activités
- [ ] Avis et notes utilisateurs (étoiles + commentaires)
- [ ] Partage de projet de voyage (lien public)

### Données et photos

- [ ] **Rendre les crédits photo accessibles depuis le site.** Les licences CC BY et CC BY-SA
      des photos de rhumeries imposent de créditer l'auteur. L'inventaire existe dans
      `backend/scripts/CREDITS_PHOTOS.md`, mais rien ne s'affiche côté public : une page
      « Crédits » ou une mention sur la fiche de chaque activité reste à faire.
- [ ] **Compléter les informations pratiques des rhumeries.** Horaires, téléphone et site
      viennent d'OpenStreetMap, mais la fréquentation n'y est documentée pour aucune
      distillerie : elle affiche « Non renseigné ». Les colonnes `visit_access` et
      `pets_allowed` existent en base mais ne sont plus affichées sur la fiche.
      La Mauny et Dillon n'ont en plus ni horaires ni téléphone. Champs à remplir dans le
      bloc `details` de chaque rhumerie, dans `backend/scripts/seed.py`.
      Attention : `seed.py` ne crée une ligne de détails que si elle manque, il ne met pas à
      jour une ligne existante. Pour corriger une valeur déjà en base, passer par SQL.
- [ ] Compléter les galeries de La Mauny et Dillon : une seule photo libre existe sur
      Wikimedia Commons pour chacune, contre 5 pour les autres distilleries.

- [ ] Photos manquantes pour les activités : Gorges de la Falaise (badge "à modifier" en place)
- [ ] Photos de couverture pour les vignettes accueil restantes : Restaurants, Activités, Rhumeries, Logements
- [ ] Enrichir la galerie photos pour les autres plages et randonnées

### Catégories à développer

- [ ] Restaurants (aucune donnée en base pour l'instant)
- [x] Rhumeries : 8 distilleries ajoutées (Neisson, Trois Rivières, Saint-James, J.M,
      La Mauny, Clément, Depaz, Dillon), coordonnées relevées sur OpenStreetMap,
      descriptions d'après Wikipédia, 28 photos Wikimedia Commons sous licence libre.
      Attributions tenues dans `backend/scripts/CREDITS_PHOTOS.md`.
- [ ] Activités nautiques / loisirs
- [ ] Logements
- [ ] Événements
- [ ] Cascades (catégorie dédiée, actuellement mappée sur Randonnées)

### Technique

- [x] **Regrouper les routes API sous un préfixe `/api/`.** Fait. Les 6 routeurs sont montés
      sous `/api` dans `app/main.py`, Swagger est sur `/api/docs`, et `frontend/nginx.conf` n'a
      plus qu'une seule règle de proxy (`location /api/`) au lieu d'une regex de neuf préfixes.
      Côté frontend, la constante `API_URL` de `js/auth-utils.js` a suffi : tous les `fetch()`
      passent par elle. Les 40 URL des tests ont été préfixées, les 29 tests restent au vert.
- [x] Faire tourner le conteneur backend avec un utilisateur non-root. Fait. L'utilisateur
      `appuser` est créé avec l'UID 1000, qui correspond au propriétaire des fichiers sur l'hôte :
      c'est cette correspondance qui règle le problème de permissions sur le bind mount.
- [x] **Ajouter `pool_pre_ping=True` à l'engine SQLAlchemy** (`app/core/database.py`). Fait
      et vérifié : après un redémarrage du seul conteneur `db`, l'API répond sans qu'il faille
      relancer le backend.
- [x] **Compléter la structure HTML de 7 pages.** Fait. `auth`, `catalogue`, `detail`,
      `detail-voyage`, `espace-personnel`, `meteo` et `planning-ia` ont désormais `<!DOCTYPE html>`,
      `<html lang="fr">`, `<head>` et `<body>`, donc plus de mode quirks. La balise
      `<meta name="viewport">` y a été ajoutée au passage : elle manquait partout, ce qui
      empêchait ces pages d'être réellement responsive sur mobile.
- [x] **Déclarer `Cache-Control` dans nginx.** Fait. `no-cache` sur tout le statique, ce qui
      force la revalidation sans interdire le cache. Les images de `/assets/` gardent leur cache
      long de 30 jours.
- [ ] **Restreindre l'exposition du port PostgreSQL avant tout déploiement.** Le service `db`
      publie `127.0.0.1:5432` pour permettre l'inspection avec un client graphique. C'est sans
      risque en local, mais à retirer ou à protéger en production.
- [ ] Alertes sargasses en temps réel (API Sargassum Watch System / USF identifiée)
- [ ] Assistant IA de planning (interface prête, logique à connecter)
- [ ] Comparateur de billets d'avion (Paris -> Fort-de-France)
- [x] Migration SQLite -> PostgreSQL (validée sur PostgreSQL 18.6 : migrations, enums, données, API, tests)
- [x] **SECURITE : règles de mot de passe côté serveur.** Corrigé le 2026-09-16. Le backend
      acceptait un mot de passe vide ou d'un caractère, les règles n'existant que dans le
      formulaire. `UserCreate` impose désormais 8 caractères, une majuscule et un chiffre, avec
      les mêmes classes de caractères que le formulaire.
- [x] **SECURITE : erreur 500 au-delà de 72 octets.** Corrigé le 2026-09-16. bcrypt 5 lève
      `ValueError` au lieu de tronquer, ce qui renvoyait une 500 à l'inscription et sur la route
      publique de connexion. La longueur est contrôlée en octets sur `UserCreate` et
      `LoginRequest`, et `verify_password` renvoie `False` plutôt que de lever.

      Les règles vivent en un seul endroit, `backend/app/core/security.py`, utilisé par les
      schémas et par `scripts/reset_password.py`.
- [x] **Erreurs de validation au format du projet.** Corrigé le 2026-09-16. FastAPI renvoyait
      une liste de messages en anglais : le frontend, qui lit `detail` comme une chaîne,
      affichait « [object Object] ». Un gestionnaire global renvoie maintenant
      `{"detail": "message en français"}` sur toutes les routes.
- [ ] Ajouter la limite de 72 octets à `validatePassword()` dans `frontend/js/auth.js`. Non
      bloquant : le serveur refuse déjà avec un message clair que le formulaire affiche. Ce
      serait un confort de saisie, pour signaler l'erreur avant l'envoi.
- [ ] **Fonction « mot de passe oublié ».** Aucune n'existe : un utilisateur qui oublie son
      mot de passe est bloqué. En développement, `backend/scripts/reset_password.py` dépanne,
      mais c'est un outil d'administration. La vraie fonctionnalité demande l'envoi d'un
      email avec un lien à usage unique et à durée limitée, donc un service d'envoi (SMTP ou
      API transactionnelle) et une nouvelle dépendance. Indispensable avant la mise en ligne.
- [ ] Déploiement (hébergement à définir)

---

## Structure du projet

```
Projet-Martinique/
├── docker-compose.yml     # orchestration des 3 conteneurs
├── .env.example           # modèle des secrets (mot de passe BDD, clé JWT)
├── backend/
│   ├── Dockerfile         # image FastAPI (python:3.14-slim)
│   ├── alembic/           # migrations de base de données
│   ├── app/
│   │   ├── core/          # config et connexion BDD
│   │   ├── models/        # tables SQLAlchemy
│   │   ├── routers/       # endpoints FastAPI
│   │   ├── schemas/       # schémas Pydantic
│   │   └── services/      # logique métier et APIs externes
│   ├── scripts/           # peuplement de la base et optimisation des photos
│   ├── tests/             # 29 tests pytest
│   └── JOURNAL.md         # historique chronologique des décisions
└── frontend/
    ├── Dockerfile         # image nginx (nginx:alpine)
    ├── nginx.conf         # sert le statique et relaie l'API vers le backend
    ├── assets/images/     # photos locales par lieu
    ├── css/               # un fichier CSS par page
    ├── js/                # un fichier JS par page
    └── *.html             # 8 pages
```

## Architecture des conteneurs

```
Navigateur → localhost:8080 → martinique-frontend (nginx)
                                ├── /, /css/, /js/, /assets/  → fichiers statiques
                                └── /api/...                   → martinique-backend:8000
                                                                   └── martinique-db:5432
```

nginx sert le site **et** relaie les appels API, donc tout passe par une seule origine.
C'est ce qui permet de garder `API_URL = ''` dans le JavaScript et de n'avoir aucune
configuration CORS à gérer.

Les données PostgreSQL vivent dans un volume Docker nommé (`pgdata`), ce qui permet de
détruire et reconstruire les conteneurs sans perdre la base.