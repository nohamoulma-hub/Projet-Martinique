# Journal du projet — backend

Historique chronologique des actions effectuées et des décisions prises, pour garder une trace du raisonnement au fil du développement.

## 2026-06-18 — Cadrage du projet

- Le projet vise à aider les voyageurs en Martinique : planning IA, suivi des sargasses et de la météo en temps réel, randonnées, rhumeries, plages notées selon la fréquentation touristique, comptes utilisateurs avec projets de voyage modifiables, base de données d'activités, logements (liens externes), événements, prix moyens des billets d'avion.
- Projet mené en solo : décision de prioriser un MVP (base de données + API CRUD de base) avant d'attaquer les fonctionnalités avancées (IA, APIs externes, auth).

## 2026-06-18 — Choix de la stack backend

- **Décision : Python + FastAPI** plutôt que Node.js + Express.
  - Raison : FastAPI est léger, asynchrone, génère une documentation interactive automatique (Swagger), et est bien adapté pour orchestrer des appels vers des APIs externes (Météo France) et une API IA (génération de planning).
- **Décision : PostgreSQL** envisagé comme base de données (pas encore mis en place) — relationnel, adapté aux relations entre activités/plages/randos/utilisateurs, avec option PostGIS si besoin de géolocalisation plus tard.

## 2026-06-18 — Mise en place du squelette backend

- Création de l'arborescence `backend/app/` avec séparation par responsabilité :
  - `routers/` — endpoints HTTP, un fichier par domaine fonctionnel.
  - `models/` — futurs modèles SQLAlchemy (tables de la base).
  - `schemas/` — futurs schémas Pydantic (validation des données entrantes/sortantes).
  - `services/` — logique métier et appels vers des APIs externes (météo, sargasses, IA).
  - `core/` — configuration transverse (settings, futur fichier de connexion BDD).
  - Raison de cette séparation : éviter de tout mettre dans un seul fichier au fur et à mesure que les fonctionnalités (plages, randos, météo, comptes...) s'ajoutent.
- Création de `app/main.py` : point d'entrée FastAPI, active CORS (pour autoriser le frontend à appeler l'API) et enregistre les routeurs.
- Création de `app/core/config.py` : centralise la configuration via variables d'environnement (`.env`), évite de coder en dur des valeurs sensibles ou changeantes (URL de BDD, clés API à venir).
- Création de `app/routers/health.py` : route `/health` de vérification, pour tester que l'API répond sans dépendre de la base de données.
- Création de `requirements.txt` : fastapi, uvicorn (serveur), pydantic-settings (lecture de la config), python-dotenv (chargement du `.env`).
- Création de `.env.example` (modèle versionné) et `.env` (réel, non versionné) pour séparer config et secrets du code.
- Création de `.gitignore` : exclusion de `venv/`, caches Python et `.env`.
- Création d'un environnement virtuel Python (`venv/`) et installation des dépendances.
- Vérification : lancement du serveur avec `uvicorn app.main:app --reload --port 8000`, test de `/health` (réponse `{"status":"ok"}`) et de `/docs` (Swagger, HTTP 200). Puis arrêt du serveur après validation.

## 2026-06-18 — Documentation du code

- Ajout de commentaires concis dans chaque fichier créé pour expliquer son rôle, afin de faciliter la reprise du projet plus tard.
- Création de ce fichier `JOURNAL.md` pour conserver une trace chronologique des décisions et de leurs raisons.

## 2026-06-18 — Conception du schéma de base de données

- **Décision sur le modèle utilisateur** : nom, prénom, email (utilisé à la fois pour le login et le contact — pas de champ séparé), nationalité, tranche d'âge.
  - Tranche d'âge en catégories fixes (Enum) plutôt qu'en champ libre, pour fiabiliser les filtres/statistiques futures : `-18`, `18-25`, `26-35`, `36-50`, `51-65`, `65+`.
- **Décision sur le catalogue d'activités (plages, randos, rhumeries, restaurants...)** : approche hybride plutôt qu'une table unique fourre-tout ou une table par catégorie isolée.
  - Une table commune `points_of_interest` (champs partagés : nom, catégorie, description, latitude/longitude, adresse) + une table d'extension par catégorie (ex: `beach_details`, `hike_details`) ne contenant que les champs spécifiques, reliée en 1-à-1 par clé étrangère.
  - Raison : permet une requête simple pour toute vue globale (carte, recherche multi-catégories) tout en gardant des champs typés et validés pour chaque catégorie (ex: score de fréquentation pour les plages, dénivelé pour les randos) — sans les colonnes vides ou le JSON non typé qu'imposeraient les deux approches plus simples.
- **Décision technique** : base de données SQLite pour la phase de développement/apprentissage (zéro configuration, un simple fichier `martinique.db`), avec migration vers PostgreSQL prévue plus tard sans réécriture du code (changement de l'URL de connexion uniquement, géré dans `app/core/config.py`).
- Ajout de `sqlalchemy` (ORM) et `alembic` (migrations futures) à `requirements.txt`, installation dans le venv.
- Création de `app/core/database.py` : engine de connexion, fabrique de sessions (`SessionLocal`), classe `Base` dont héritent tous les modèles, et dépendance `get_db()` pour l'injection de session dans les routes FastAPI.
- Création de `app/models/user.py` (table `users`) : premier modèle écrit en exemple pédagogique pour expliquer la syntaxe SQLAlchemy déclarative (Column, types, Enum, contraintes).
- Création de `app/models/point_of_interest.py` (table `points_of_interest`) : écrite par l'utilisateur en exercice guidé, avec relecture itérative — corrections apportées sur un import erroné (`sqlachemy` → `sqlalchemy`), un import manquant (`func`), la convention de nommage (classe en PascalCase, table en minuscules), et deux fautes de frappe dans les valeurs de l'Enum `Category` (`rum_distellery` → `rum_distillery`, `accomodation` → `accommodation`). Import final vérifié avec succès.

## 2026-06-18 — Définition du périmètre v1

- **Décision : réduire le périmètre du v1** pour obtenir un produit utilisable (et présentable en portfolio) plus rapidement, plutôt que viser toutes les fonctionnalités imaginées dès le départ.
  - Raison : projet mené en solo par un développeur junior ; estimation d'environ 120-180h pour un v1 ciblé contre 350-500h pour la liste complète des fonctionnalités.
- **Inclus dans le v1** :
  1. Catalogue d'activités (`points_of_interest` + 2-3 catégories détaillées, ex: plages avec score de fréquentation, randonnées avec difficulté) — démontre le modèle hybride conçu.
  2. Comptes utilisateurs (inscription/connexion, mot de passe hashé).
  3. Projets de voyage (création, ajout d'activités du catalogue, modification).
  4. Météo en direct (appel à une API météo externe, affichage simple).
  5. Frontend connecté à l'API (listes dynamiques, formulaire de compte, page projet de voyage), en adaptant `first_page.html`/`maquette.html`.
- **Reporté après le v1** : IA de planning, suivi temps réel des sargasses, pages dédiées rhumeries/restaurants/événements, comparateur de billets d'avion, logements — affichées comme "à venir" sur le site (cohérent avec le badge "Bientôt" déjà présent dans la maquette).

## 2026-06-18 — Tables d'extension du catalogue (beach_details, hike_details)

- Création de `app/models/beach_details.py` (table `beach_details`) : écrite par l'utilisateur, introduit le concept de `ForeignKey` (`point_of_interest_id`, avec `unique=True` pour garantir la relation 1-à-1 avec `points_of_interest`). Champs spécifiques : `tourist_score` (Integer, fréquentation 0-5), `amenities` (Text, optionnel). Corrections apportées en relecture : `def` remplacé par `class` (la table doit être une classe, pas une fonction), import erroné de `Base` depuis `sqlalchemy` corrigé en `app.core.database`, import dupliqué de `ForeignKey` supprimé, `amenities` repassé en `nullable=True`.
- Création de `app/models/hike_details.py` (table `hike_details`) : écrite en autonomie par l'utilisateur sur le même modèle. Champs spécifiques : `difficulty` (String), `elevation_gain` et `elevation_loss` (Integer, en mètres — dénivelé positif/négatif séparés plutôt qu'une seule valeur, décision prise pour refléter que les deux varient indépendamment selon le tracé et sont utiles pour estimer l'effort), `duration` (Integer, en minutes plutôt qu'un texte formaté, pour permettre des filtres/tris numériques). Corrections en relecture : erreur bloquante `Column(String(10), Integer, ...)` (deux types passés à la fois, à corriger en un seul type), faute de frappe `dificult` → `difficulty`, import `Text` inutilisé retiré, commentaire obsolète mis à jour après le changement de type de `duration`.
- Vérification : les 4 modèles (`User`, `PointOfInterest`, `BeachDetails`, `HikeDetails`) s'importent ensemble sans conflit.

## 2026-06-18 — Projets de voyage (travel_projects, travel_project_items)

- Création de `app/models/travel_project.py` (table `travel_projects`) : relation 1-à-plusieurs avec `users` via `user_id` (ForeignKey **sans** `unique=True`, contrairement à `beach_details`/`hike_details` — un utilisateur peut avoir plusieurs projets). Champs : `title` (obligatoire), `start_date`/`end_date`/`budget` (optionnels, pour permettre de créer un projet "brouillon" avant d'avoir fixé ces détails). Correction en relecture : import erroné `app.core.date` → `app.core.database`, et nullable inversés par rapport à la décision (title/dates/budget) corrigés.
- Création de `app/models/travel_project_item.py` (table `travel_project_items`) : table de liaison many-to-many "enrichie" (objet d'association) entre `travel_projects` et `points_of_interest`, avec deux `ForeignKey` (`travel_project_id`, `point_of_interest_id`) volontairement **non uniques** — une activité peut apparaître dans plusieurs projets, un projet peut contenir plusieurs activités. Champs propres à l'association : `day_number` (numéro du jour du voyage), `status` (Enum `Status` : `PLANNED`/`CONFIRMED`/`DONE`). Correction en relecture : import erroné de `Base` depuis `sqlalchemy` (même erreur que sur `beach_details`, corrigée en `app.core.database`). Confirmé que `Column(ForeignKey(...))` sans type explicite est valide en SQLAlchemy (déduction automatique du type `INTEGER` depuis la colonne référencée).
- Vérification : les 6 modèles (`User`, `PointOfInterest`, `BeachDetails`, `HikeDetails`, `TravelProject`, `TravelProjectItem`) s'importent ensemble sans conflit.

## Prochaines étapes envisagées (rédigé le 2026-06-18, réalisé le 2026-08-06)

- Créer les tables réellement en base (via `Base.metadata.create_all` ou une première migration Alembic) pour valider le schéma.
- Brancher une première route avec données statiques pour valider le flow API avant d'introduire la BDD réelle.

## 2026-06-18 — Mise en place d'Alembic et création des tables

- **Décision : utiliser Alembic** plutôt que `Base.metadata.create_all()`, malgré la phase encore expérimentale du projet — raison : apprendre l'outil de migration tôt plutôt que de tout refaire plus tard, et `create_all()` ne sait pas modifier une table existante (seulement créer celles qui manquent), ce qui devient un problème dès qu'il y a de vraies données en base.
- Initialisation avec `alembic init alembic`, générant `alembic.ini`, `alembic/env.py`, `alembic/script.py.mako` et `alembic/versions/`.
- Configuration de `alembic/env.py` : import de `Base` et de tous les modèles (pour qu'ils s'enregistrent sur `Base.metadata`), `target_metadata = Base.metadata` (permet l'autogeneration des migrations), et URL de connexion lue dynamiquement depuis `app.core.config.settings.database_url` plutôt que dupliquée en dur dans `alembic.ini`.
- Génération de la première migration avec `alembic revision --autogenerate -m "create v1 tables"` : Alembic a correctement détecté les 6 tables à créer en comparant nos modèles à la base (encore vide).
- Application avec `alembic upgrade head` : les 6 tables (`points_of_interest`, `users`, `beach_details`, `hike_details`, `travel_projects`, `travel_project_items`) + la table technique `alembic_version` existent désormais dans `martinique.db`. Vérifié directement via une requête SQLite.

## 2026-08-04 — Décision d'adopter une approche agentique

- **Décision : développer le projet avec des agents IA (Claude Code)** plutôt qu'en codant manuellement chaque fonctionnalité.
  - Motivation principale : volonté de s'entraîner au développement agentique — apprendre à orchestrer des agents IA sur un projet réel, comprendre comment les cadrer, valider leur travail et les corriger.
  - Avantage pratique : projet mené en solo par un développeur junior — les agents permettent de produire du code de qualité plus rapidement tout en gardant une posture d'apprentissage (comprendre ce qui est généré, valider les décisions, itérer).
  - Approche retenue : un agent par domaine fonctionnel (backend, frontend), lancés séquentiellement (backend d'abord, frontend ensuite une fois les endpoints disponibles). Les agents travaillent sur des périmètres bornés pour que leurs résultats restent lisibles et vérifiables.
- **Décision : commencer par le v1 uniquement** plutôt que de créer tous les agents pour le produit final.
  - Raison : un périmètre réduit produit un résultat fonctionnel plus vite, les bugs sont plus faciles à isoler, et les besoins des fonctionnalités avancées (IA de planning, sargasses) seront mieux définis une fois le v1 en production. Les agents futurs s'appuieront sur les bases posées par le v1.

## 2026-08-04 — Création des maquettes frontend (8 pages)

- **Décision : concevoir toutes les maquettes HTML/CSS/JS avant de brancher le backend**, pour avoir une référence visuelle claire de ce que chaque endpoint doit retourner.
- **Design system "Madras"** défini et appliqué sur toutes les pages :
  - Variables CSS : `--rouge #C8392B`, `--jaune #F0B429`, `--vert #1D7A4E`, `--bleu #1A5C8A`, `--sable #F5EDD8`, `--nuit #0D1F2D`
  - Typographies : Playfair Display (titres) + DM Sans (corps)
  - Logo fleur SVG (5 ellipses roses + centre jaune), barre de progression madras en haut de nav
- **8 pages créées** dans `frontend/` :
  - `accueil.html` — page d'accueil avec hero, aperçu catalogue/météo/planning IA, prix moyens des vols
  - `catalogue.html` — liste des activités filtrables par catégorie
  - `detail.html` — fiche détail d'une activité (plage Anse Céron comme exemple)
  - `meteo.html` — météo en direct + alertes sargasses
  - `planning-ia.html` — interface chat IA + planning généré en accordéon par semaine
  - `auth.html` — connexion / inscription
  - `espace-personnel.html` — tableau de bord utilisateur connecté, liste des projets
  - `detail-voyage.html` — détail d'un projet de voyage avec activités
- **Choix de navigation** : nav commune sur toutes les pages (Catalogue / Météo / Planning IA / Mon voyage), avec lien actif surligné en jaune. Les pages "connecté" (espace personnel, détail voyage, planning IA) affichent la bulle d'initiales du client à la place du bouton "Mon voyage".

## 2026-08-06 — Séparation HTML / CSS / JS

- **Décision : séparer le CSS et le JS des fichiers HTML** pour respecter les bonnes pratiques de développement web (lisibilité, maintenabilité, réutilisabilité).
- Extraction automatique via script Python : chaque page génère son propre `css/[page].css` et `js/[page].js` dans des sous-dossiers dédiés.
- Chaque fichier HTML référence désormais ses ressources via `<link rel="stylesheet">` et `<script src="">`.
- Structure finale de `frontend/` :
  ```
  frontend/
  ├── *.html       (structure uniquement)
  ├── css/         (un fichier CSS par page)
  └── js/          (un fichier JS par page)
  ```

## 2026-08-12 — Mission agent Backend v1 : construction des endpoints et des tests

### Ce qui a été construit

**Nouveaux fichiers créés (hors tests) :**
- `app/core/security.py` : utilitaires JWT (création/décodage de token via python-jose) et hachage bcrypt des mots de passe. Utilise `bcrypt` directement sans passlib (passlib 1.7.4 incompatible avec bcrypt 5.x sur Python 3.14).
- `app/schemas/user.py` : schémas Pydantic pour inscription (`UserCreate`), modification profil (`UserUpdate`) et lecture (`UserRead`).
- `app/schemas/auth.py` : schémas `Token` et `LoginRequest`.
- `app/schemas/travel_project.py` : schémas pour les projets et leurs items. Mapping manuel `title -> name` et `point_of_interest_id -> activity_id` géré dans le routeur (pas de modification des modèles existants).
- `app/schemas/meteo.py` : schéma `MeteoActuelle`.
- `app/services/auth_service.py` : dépendance FastAPI `get_current_user` (extraction et validation du token JWT depuis le header `Authorization: Bearer`).
- `app/services/meteo_service.py` : appel à l'API Open-Meteo (gratuite, sans clé API, coordonnées de Fort-de-France).
- `app/routers/activites.py` : `GET /activites` (pagination, filtres categorie/search/sort) et `GET /activites/{id}` avec beach_details ou hike_details selon la catégorie.
- `app/routers/auth.py` : `POST /auth/inscription` et `POST /auth/connexion`.
- `app/routers/utilisateurs.py` : `GET /utilisateurs/moi` et `PUT /utilisateurs/moi` (protégés).
- `app/routers/projets.py` : CRUD complet `/projets` + `POST /projets/{id}/activites` et `DELETE /projets/{id}/activites/{item_id}` (tous protégés, isolation par utilisateur).
- `app/routers/meteo.py` : `GET /meteo`.
- `scripts/seed.py` : 8 vraies plages et 7 vraies randonnées de Martinique avec coordonnées GPS et détails (tourist_score, difficulte, denicelle, durée).
- `tests/conftest.py`, `tests/test_activites.py`, `tests/test_auth.py`, `tests/test_projets.py` : 29 tests, tous verts.

**Fichiers modifiés :**
- `app/main.py` : enregistrement de tous les routeurs, description API pour Swagger, `allow_credentials=True` sur CORS.
- `app/core/config.py` : ajout `jwt_secret_key`, `jwt_expire_hours`; migration vers Pydantic v2 (`model_config`, `computed_field`).
- `app/schemas/point_of_interest.py` : ajout `BeachDetailsRead`, `HikeDetailsRead`, `PointOfInterestDetail`.
- `requirements.txt` : ajout `python-jose[cryptography]`, `bcrypt`, `pydantic[email]`, `httpx`, `pytest`.
- `.env` / `.env.example` : ajout `JWT_SECRET_KEY` et `JWT_EXPIRE_HOURS`.

### Decisions techniques

- **Météo** : Météo France nécessite une inscription et une clé API. Décision d'utiliser Open-Meteo (gratuite, sans clé, couvre la Martinique via coordonnées GPS). Le service peut être remplacé sans changer le routeur.
- **bcrypt** : `passlib` 1.7.4 est incompatible avec `bcrypt` 5.0.0 (Python 3.14). Utilisation de `bcrypt` directement.
- **Mapping title/name** : le modèle `TravelProject` utilise `title` mais la spec v1 expose `name`. Plutôt que de modifier le modèle, le mapping est fait manuellement dans le routeur via la fonction `_build_project_read()`.
- **Tests** : base SQLite en mémoire, isolation par rollback de transaction (chaque test repart d'une base propre).
- **18 routes enregistrées**, 29 tests, 15 activités en base (8 plages + 7 randonnées).

## 2026-08-07 — Lancement de l'agent Backend v1

- **Prochaine étape : agent Backend v1** — construire les endpoints FastAPI pour le périmètre v1 :
  1. Catalogue : liste et détail des activités (plages, randos)
  2. Utilisateurs : inscription, connexion (auth JWT), profil
  3. Projets de voyage : CRUD (créer, lire, modifier, supprimer)
  4. Météo : endpoint proxy vers une API météo externe
- La base de données est prête (6 tables créées via Alembic). Il reste à écrire les routeurs, schémas Pydantic et services.
- Une fois les endpoints disponibles, un agent Frontend viendra connecter les 8 maquettes à l'API.

## 2026-08-12 — Mission agent Frontend v1 : connexion des 8 maquettes à l'API

### Ce qui a été construit

**Nouveau fichier cree :**
- `frontend/js/auth-utils.js` : utilitaires partagés entre toutes les pages JS — `API_URL`, `getToken()`, `getAuthHeaders()`, `requireAuth()`, `handleUnauthorized()`, `loadNavAvatar()`. Ce fichier est charge avant chaque JS de page.

**Fichiers JS mis a jour :**
- `js/auth.js` : connexion (`POST /auth/connexion`) et inscription (`POST /auth/inscription`) avec stockage du JWT dans `localStorage`, validation mot de passe cote client (8 char, majuscule, chiffre), erreurs API affichees sous le formulaire, bouton Google -> "Bientot disponible", redirection vers `espace-personnel.html` apres succes.
- `js/catalogue.js` : chargement dynamique depuis `GET /activites` avec filtres categorie (`beach`/`hike`), recherche textuelle (debounce 400ms, 3 caracteres minimum), tri, pagination "Voir plus". Filtres hors scope (Rhumeries, Restaurants, Activites, Evenements, Logements, Marche) affichent un message "Bientot disponible" dans la grille sans désactiver les boutons.
- `js/detail.js` : chargement depuis `GET /activites/{id}`, remplissage du hero (badge, titre, location, coords GPS), fiche pratique sidebar (beach_details ou hike_details selon la categorie), section acces, breadcrumb dynamique, bouton "Ajouter a mon voyage" ouvre une modale listant les projets (`GET /projets`) puis appelle `POST /projets/{id}/activites`, bouton "Sauvegarder" -> "Bientot disponible".
- `js/espace-personnel.js` : protection JWT (`requireAuth`), chargement du profil (`GET /utilisateurs/moi`) avec initiales dans l'avatar et la nav, chargement des projets (`GET /projets`), modale "Nouveau projet" avec `POST /projets`, stats hero dynamiques (nombre de projets, jours avant le depart), onglets "Activites sauvegardees" et "Parametres" -> "Bientot disponible", bandeau sur les activites sauvegardees statiques.
- `js/detail-voyage.js` : protection JWT, chargement du projet (`GET /projets/{id}`), rendu dynamique des day-blocks groupes par `day_number` avec calcul de la date reelle (start_date + day_number - 1), barre de progression, sidebar recap, modale d'ajout d'activite (`GET /activites?search=...` + `POST /projets/{id}/activites`), bouton "Retirer" (`DELETE /projets/{id}/activites/{item_id}`), boutons "Partager"/"Exporter PDF"/"Modifier" -> "Bientot disponible", "Optimiser avec l'IA" -> `planning-ia.html?projet_id=...`.
- `js/accueil.js` : progress bar, `GET /meteo` pour mettre a jour la carte "Temperature mer" dans la section live (les autres cartes restent statiques car les champs sea_temperature/sunshine_hours/rainfall_7d ne sont pas dans l'API v1).
- `js/meteo.js` : `GET /meteo` pour mettre a jour le hero (temperature, description, emoji meteo, heure d'actualisation, vent et humidite). Les champs manquants (ressenti, UV, pression, visibilite) restent statiques depuis la maquette.
- `js/planning-ia.js` : protection JWT, `GET /projets/{id}` si `?projet_id=` present dans l'URL pour afficher le nom du projet dans la context bar, bandeau "Assistant IA bientot disponible" en haut du chat, chips et zone de saisie en opacite reduite, boutons "Regenerer" et "Valider" -> "Bientot disponible".

**Fichiers HTML mis a jour :**
- Ajout de `<script src="js/auth-utils.js">` avant le JS de page sur les 8 pages HTML.

### Decisions techniques

- **auth-utils.js partage** : plutot que de dupliquer `API_URL` et `getAuthHeaders()` dans chaque JS, un fichier commun est charge en premier sur chaque page. Les pages protegees appellent `requireAuth()` au demarrage.
- **Champ `address` en lieu de `commune`** : le modele `PointOfInterest` n'a pas de champ `commune`. On extrait la premiere partie du champ `address` (ex: "Le Precheur, Martinique" -> "Le Precheur") via `extractCommune()`.
- **Champs meteo absents** : l'API Open-Meteo via le service backend ne retourne pas `sea_temperature`, `sunshine_hours`, `rainfall_7d`. Conformement a la spec, les valeurs statiques de la maquette sont conservees pour ces champs.
- **`TravelProjectItem` sans champ `time`** : le modele n'a pas de champ horaire. Les activity-cards affichent "-" pour l'heure, en attendant une evolution v2.
- **`TravelProject` sans `travelers_count` ni `status`** : le modele n'a pas ces champs. Le statut est calcule dynamiquement depuis les dates (En cours / Planifie / Termine / Brouillon). Le nombre de voyageurs affiche "-" en sidebar.
- **Maquette conservee pixel-perfect** : aucune modification des fichiers HTML ni CSS. Toutes les donnees dynamiques sont injectees via JavaScript dans les elements existants.

### Perimetre non connecte en v1 (conforme a la spec)

- Sargasses : statiques sur accueil.html, meteo.html et detail-voyage.html
- Comparateur de vols : statique sur accueil.html
- Previsions 7 jours sur meteo.html : statiques (l'API ne retourne pas de tableau de previsions)
- Plages recommandees sur meteo.html : statiques
- Activites sauvegardees : bandeau "Bientot disponible" sur espace-personnel.html
- Chat IA sur planning-ia.html : messages statiques de la maquette, bandeau "bientot disponible"
