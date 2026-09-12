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

## 2026-08-12 - Retours utilisateur apres test v1 : evolutions prevues pour v2

Suite au premier test complet du site v1, les points suivants ont ete identifies pour la prochaine iteration :

### Navigation et etat de connexion
- **Renommage "Mon voyage" en "Mes projets"** : le bouton CTA rouge "Mon voyage" devient un onglet "Mes projets" au meme style que les autres liens de nav (Catalogue / Meteo / Planning IA). Ce changement s'applique sur toutes les pages publiques : accueil.html, catalogue.html, meteo.html, detail.html.
- **Bulle de connexion sur toutes les pages** : quand un utilisateur est connecte, ajouter la bulle d'initiales (nav-avatar) a droite des liens de nav sur toutes les pages (y compris accueil, catalogue, meteo, detail). Elle s'affiche en plus des liens, pas a la place.
- **Menu deroulant sur la bulle** : un clic sur la bulle ouvre un petit menu deroulant avec deux options : "Mon espace personnel" (lien vers espace-personnel.html) et "Se deconnecter" (supprime le JWT du localStorage et redirige vers accueil.html).
- **Bouton "Se connecter" conditionnel** : sur accueil.html, masquer ce bouton dans le hero si un JWT valide est present dans localStorage.
- **Logo cliquable** : sur toutes les pages, le logo doit pointer vers accueil.html (certaines pages ont deja href="#").

### Page detail.html
- **Confirmation "Ajouter a mon voyage"** : remplacer le message de confirmation textuel par une animation discrete a droite du bouton (icone checkmark dans le theme du site). L'indicateur reste visible tant que l'activite est dans un projet de l'utilisateur (verifier via GET /projets au chargement de la page).
- **Bouton retour vers le catalogue** : ajouter un lien "Retour au catalogue" dans la banniere hero (meme style que le lien "Retour au catalogue" dans espace-personnel.html), permettant de revenir a la liste via history.back() ou parametres URL.
- **Differentiation visuelle plage / randonnee** : les fiches plage et randonnee doivent avoir une couleur d'accent differente dans le hero et la sidebar (ex: bleu pour les plages, vert pour les randonnees, coherent avec le design system Madras).
- **Bloc "Alerte sargasses"** : n'afficher ce bloc que pour les activites de type plage (beach), pas pour les randonnees (hike).

### Animations
- **Animation d'arrivee** : appliquer la meme animation d'entree de page qu'accueil.html sur catalogue.html et meteo.html.

## 2026-08-13 - Mission agent Frontend v2 : navigation unifiee, detail.html et animations

### Ce qui a ete construit

**Fichier JS modifie (fondation) :**
- `frontend/js/auth-utils.js` : ajout de `updateNav()`, `injectAvatarBubble()`, `injectAvatarStyles()`, `fetchInitials()`. La fonction `updateNav()` est la fonction centrale appelee au DOMContentLoaded sur toutes les pages publiques. Elle injecte le lien "Accueil" en premiere position de nav-links s'il est absent, remplace "Mon voyage" (nav-cta rouge) par "Mes projets" (lien normal) si l'utilisateur est connecte, et injecte la bulle d'initiales avec son menu deroulant (Mon espace personnel / Se deconnecter).

**HTML modifies :**
- `frontend/accueil.html` : logo nav et logo footer en `href="accueil.html"` (etaient `href="#"`).
- `frontend/catalogue.html` : logo `href="accueil.html"`.
- `frontend/meteo.html` : logo `href="accueil.html"`, lien breadcrumb Accueil `href="accueil.html"`.
- `frontend/detail.html` : logo `href="accueil.html"`.

**JS modifies :**
- `frontend/js/accueil.js` : remplace `loadNavAvatar()` par `await updateNav()`, masque `.hero-actions .btn-primaire` si JWT present.
- `frontend/js/catalogue.js` : appel `await updateNav()` en DOMContentLoaded.
- `frontend/js/meteo.js` : appel `await updateNav()` en DOMContentLoaded.
- `frontend/js/detail.js` : remplace `loadNavAvatar()` par `await updateNav()`, ajoute `injectBackButton()` (lien "Retour au catalogue" via history.back(), injecte entre breadcrumb et hero), `applyTypeAccent(category)` (badge hero et bordure fiche-header en bleu pour beach, vert pour hike), `handleAlerteCard(category)` (masque .alerte-card pour les randonnees), `checkAlreadyInProject(activiteId)` (appel GET /projets au chargement, compare items.activity_id avec l'activite courante), `showCheckmark(projectNames)` (injecte le bouton checkmark a cote du bouton "Ajouter", bulle listant les projets au clic). Apres un ajout reussi, showCheckmark remplace le message textuel.

**CSS modifies :**
- `frontend/css/catalogue.css` : ajout `@keyframes fadeUp` + animations (opacity 0 -> 1, translateY) sur `.page-eyebrow`, `.page-title`, `.page-subtitle`, `.search-bar`, avec delais echelonnes de 0.3s a 0.9s.
- `frontend/css/meteo.css` : ajout `@keyframes fadeUp` et `@keyframes fadeLeft` + animations sur `.meteo-localisation`, `.meteo-temp-row`, `.meteo-update` (fadeUp), `.meteo-main-right` (fadeLeft).
- `frontend/css/detail.css` : ajout styles pour `.back-to-catalogue`, `.checkmark-btn`, `.checkmark-bubble`, `.cta-voyage-row`.

### Decisions techniques

- **Menu deroulant en position fixed** : la nav a `overflow: hidden` sur toutes les pages. Plutot que de l'overrider (risque de casse visuelle), le dropdown est injecte dans `document.body` avec `position: fixed` et positionne via `getBoundingClientRect()` de la bulle. Meme approche pour la bulle de checkmark.
- **Lien Accueil injecte par JS** : plutot que de modifier chaque HTML, `updateNav()` injecte le `<li>Accueil</li>` dynamiquement si absent. Cela centralise la logique en un seul endroit.
- **Checkmark base sur GET /projets** : le backend retourne les items complets dans `TravelProjectRead.items` (champ `activity_id` sur chaque item). Un seul appel API suffit pour verifier si l'activite est dans n'importe quel projet.
- **applyTypeAccent en styles inline** : la differentiation beach/hike est appliquee via JS (`element.style`) sans modifier le CSS statique, ce qui respecte la contrainte de la spec.
- **Animations CSS pures** : les animations d'arrivee sont declarees en CSS (`opacity: 0; animation: fadeUp .8s Xs forwards;`), identiques aux keyframes d'accueil.css. Aucune librairie JS externe.
- **12 commits** : un par fichier modifie, format conventional commits en anglais, sans tiret cadratin, sans Co-Authored-By.

## 2026-08-21 - Unification de la nav bar sur toutes les pages

Suite aux tests v1, la nav bar presentait plusieurs incohérences entre les pages : bulle d'initiales absente sur catalogue.html quand l'utilisateur etait connecte, decalage de layout sur meteo.html, menu non mis a jour sur planning-ia.html et espace-personnel.html.

### Problemes identifies et corriges

- **Conflit de variable globale dans catalogue.js** : `let currentPage = 1` (variable de pagination) masquait la fonction `currentPage()` importee depuis auth-utils.js dans la portee globale. Quand `updateNav()` appelait `currentPage()`, elle obtenait `1` (un nombre) et levait une TypeError silencieuse, empeechant la mise a jour de la nav et l'affichage de la bulle. Correction : renommage de toutes les occurrences en `currentPageNum` dans catalogue.js.
- **Bulle d'initiales en dessous du menu sur meteo.html** : le conteneur `.nav-right-group` manquait de declarations CSS explicites (`flex-direction: row; flex-wrap: nowrap`). Sans ces proprietes, le navigateur appliquait un wrap qui poussait la bulle sur une deuxieme ligne. Correction : ajout de ces proprietes dans meteo.css et alignement sur la structure de accueil.css.
- **Leger decalage vertical sur meteo.html (non connecte)** : `.nav-links` manquait de `align-items: center`. Corrige dans meteo.css.
- **Menu non mis a jour sur planning-ia.html et espace-personnel.html** : `updateNav()` n'etait pas appele au DOMContentLoaded de ces deux pages. Elles affichaient des initiales "MD" codees en dur et seulement 3 liens. Correction : ajout de `await updateNav()` dans planning-ia.js et espace-personnel.js.

### Structure HTML uniformisee

Toutes les pages publiques (accueil, catalogue, meteo, detail, planning-ia, espace-personnel) suivent desormais la meme structure de nav :
- `<div class="madras-bar" id="madrasBar">` en premier enfant de `<nav>` (avant le logo)
- Logo multi-ligne avec `<span class="nav-sub">`
- `<div class="nav-right-group">` englobant `<ul class="nav-links">`
- La bulle `.nav-avatar` est injectee par JS dans `.nav-right-group` via `injectAvatarBubble()` quand l'utilisateur est connecte

### Etat final de la nav par page

| Page | Non connecte | Connecte |
|---|---|---|
| accueil.html | Accueil / Catalogue / Meteo / Planning IA / Mon voyage (rouge) | Accueil / Catalogue / Meteo / Planning IA / Mes projets + bulle |
| catalogue.html | idem | idem |
| meteo.html | idem | idem |
| detail.html | idem | idem |
| planning-ia.html | (page protegee, redirige) | Accueil / Catalogue / Meteo / Planning IA / Mes projets + bulle |
| espace-personnel.html | (page protegee, redirige) | idem |
| auth.html | Accueil / Catalogue / Meteo / Planning IA (pas de bulle, page de login) | s.o. |

- **10 commits** pousses : catalogue.html, css/catalogue.css, js/catalogue.js, meteo.html, css/meteo.css, js/planning-ia.js, css/planning-ia.css, js/espace-personnel.js, css/espace-personnel.css, auth.html.

## 2026-08-23 - Ajout de photos aux activites : galerie, lightbox et assets locaux

### Ce qui a ete construit

**Backend :**
- `app/models/poi_image.py` : nouveau modele `PoiImage` (table `poi_images`) avec `poi_id` (FK vers `points_of_interest`, CASCADE delete), `url` (String 500) et `order` (Integer). Permet de stocker plusieurs photos par activite dans l'ordre souhaite.
- Migration Alembic `93ca07e02899_add_poi_images_table.py` : creee par autogenerate et appliquee.
- `app/schemas/point_of_interest.py` : ajout de `PoiImageRead` (id, url, order) et du champ `images: list[PoiImageRead] = []` dans `PointOfInterestDetail`.
- `app/routers/activites.py` : `GET /activites/{id}` charge desormais les `PoiImage` associees (triees par `order`) et les inclut dans la reponse.
- `app/main.py` : ajout d'un mount `/assets` pointant vers `frontend/assets/` pour servir les photos locales via HTTP (distinct du mount `/site` qui sert le frontend complet).
- `alembic/env.py` : ajout de `poi_image` dans les imports pour qu'Alembic detecte le modele lors des autogenerations futures.

**Donnees :**
- Nouvelle activite **Anse Couleuvre** creee en base (id=16, category=beach, tourist_score=2, plage sauvage accessible depuis Le Precheur, coordonnees GPS 14.8465 N / 61.2283 O).
- 10 photos ajoutees en table `poi_images` : 2 pour Anse Noire, 4 pour Anse Dufour, 4 pour Anse Couleuvre.
- `image_url` mis a jour pour Anse Noire (`anse_noir_1.jpeg`) et Cascade Couleuvre (photo personnelle, chemin local).

**Assets :**
- Dossier `frontend/assets/images/` cree avec sous-dossiers par lieu : `anse_noir/`, `anse_dufour/`, `anse_couleuvre/`, `Cascade Couloeuvre.JPG` a la racine.

**Frontend :**
- `js/detail.js` : ajout de `fillGallery(images)` qui remplace les placeholders emoji de `.gallery-grid` par les vraies photos (background-image), et de `openLightbox(urls, startIndex)` qui gere la vue agrandie au clic.
- `js/catalogue.js` : retrait de `Cascade Couleuvre` du tableau `PLACEHOLDER_NAMES` (photo reelle disponible).
- `css/detail.css` : ajout de `border-radius: 6px` sur `.gallery-item`, animation `translateY(-3px)` + `scale(1.06)` sur la photo au survol, et styles complets pour le lightbox (overlay, animation d'ouverture via `cubic-bezier(.34,1.56,.64,1)`, boutons de navigation prev/next, compteur, fermeture Echap/clic exterieur).

### Decisions techniques

- **Table separee `poi_images`** plutot qu'un champ JSON sur `PointOfInterest` : garantit l'integrite referentielle, permet de trier les photos et d'en ajouter/supprimer individuellement sans modifier le modele principal.
- **Mount `/assets` distinct de `/site`** : permet aux URLs stockees en base (`/assets/images/...`) d'etre resolues directement sans prefixe `/site/`, independamment de la page depuis laquelle elles sont appelees.
- **Lightbox pure JS/CSS** sans librairie externe : coherent avec la stack vanilla du projet, pas de dependance supplementaire.
- **Animation d'ouverture** : `cubic-bezier(.34,1.56,.64,1)` donne un leger effet de rebond (overshoot) discret, plus vivant qu'une courbe lineaire ou ease-in-out classique.
- **4 commits** pousses : backend (modele + migration + assets mount), schema + router, assets photos, frontend (galerie + lightbox).

## 2026-09-12 - Donnees reproductibles, migration PostgreSQL et conteneurisation

Session longue couvrant trois chantiers lies : rendre les donnees reproductibles, migrer vers
PostgreSQL, puis decouper le projet en trois conteneurs Docker.

### 1. Rendre les donnees reproductibles (prealable indispensable)

**Probleme identifie** : `backend/martinique.db` est exclu par `.gitignore` (`*.db`). Or tout le
travail recent sur les photos (creation d'Anse Couleuvre, 16 `image_url`, 10 photos de galerie)
avait ete fait en commandes Python ponctuelles, donc n'existait que dans ce fichier local. Toute
migration vers une base vide l'aurait perdu.

- `scripts/seed.py` : ajout d'Anse Couleuvre a la liste `BEACHES` (16 activites au total).
- `scripts/update_images.py` : `IMAGES` mis a jour avec les chemins locaux reels (les anciennes
  URLs Wikimedia du 21 aout etaient perimees). Anse Noire, Anse Dufour, Anse Couleuvre et
  Cascade Couleuvre pointent desormais vers `/assets/`.
- `scripts/seed_gallery.py` (nouveau) : peuple `poi_images` pour les 3 activites photographiees.
  Idempotent (supprime les photos existantes de l'activite avant reinsertion).
- **Verification** : chaine complete rejouee sur une base SQLite vierge, puis comparaison
  valeur par valeur avec la base de reference. Identique sur les 4 tables.

**Bug corrige au passage** : la vignette du catalogue d'Anse Dufour affichait encore la photo
Wikimedia alors que sa galerie contenait 4 photos personnelles. La couverture (`image_url`) et
la galerie (`poi_images`) sont deux champs independants : ajouter des photos a la galerie ne
change pas la couverture, ni le bandeau hero de la page de detail.

### 2. Optimisation des photos

`scripts/optimize_images.py` (nouveau, necessite Pillow ajoute a `requirements.txt`) :
redimensionne a 1600 px sur le cote long, qualite JPEG 85.

- Resultat : **12 Mo -> 3,8 Mo (67 % de gain)**. `cascade_couleuvre.JPG` passait 6 Mo en
  4032 px pour une vignette affichee en 400 px.
- **Idempotent** : une photo deja sous la limite est laissee intacte, donc pas de degradation
  en cas de relance.
- **Rotation EXIF gravee dans les pixels** via `ImageOps.exif_transpose()` : les photos de
  telephone stockent leur orientation en metadonnee, qui serait perdue au reenregistrement.

### 3. Migration PostgreSQL

**Verifiee de bout en bout** sur un PostgreSQL 18.6 reel installe temporairement dans le
conteneur de dev, avant toute mise en conteneur.

- Les 3 migrations Alembic passent **sans modification** : `sa.Enum(...)` est agnostique du
  dialecte, donc PostgreSQL cree de vrais types ENUM (`category`, `agerange`, `itemstatus`)
  la ou SQLite utilisait du VARCHAR. Aucun `batch_alter_table` a corriger.
- La colonne `order` de `poi_images` (mot reserve SQL) est echappee automatiquement par
  SQLAlchemy, aucune intervention necessaire.
- Donnees identiques a la reference SQLite sur les 4 tables. API, inscription, bcrypt, JWT et
  les 29 tests : tous verts.

**Seul bug rencontre** : `app/core/database.py` passait `connect_args={"check_same_thread": False}`
a tous les drivers. Ce parametre est propre a SQLite et psycopg2 le rejette avec `invalid dsn`.
Il est desormais conditionnel au dialecte. A noter que **les migrations Alembic passaient malgre
ce bug**, car `alembic/env.py` cree son propre engine : seul le code applicatif echouait. C'est
typiquement le genre de piege qu'un test reel revele et qu'une relecture de code manque.

`psycopg2-binary==2.9.13` ajoute a `requirements.txt` (les wheels existent pour Python 3.14).

### 4. Conteneurisation : trois conteneurs

**Motivation de l'utilisateur** : isoler les parties du projet pour qu'une mauvaise manipulation
ne casse pas l'ensemble.

**Point important clarifie** : le multi-conteneurs n'est **pas** plus performant. Un appel
backend vers la base passe par le reseau au lieu d'un acces fichier local, et 3 conteneurs
consomment plus de RAM qu'un seul. Les vrais benefices sont l'isolation, la persistance des
donnees via volume nomme, la reproductibilite et la proximite avec la production.

**Architecture retenue (option C sur 3 evaluees) : nginx en reverse proxy.**

```
Navigateur -> localhost:8080 -> martinique-frontend (nginx)
                                 |- /, /css/, /js/, /assets/ -> fichiers statiques
                                 `- /activites, /auth, ...    -> martinique-backend:8000
                                                                  `- martinique-db:5432
```

Les deux alternatives ecartees :
- **nginx avec appels API directs** : aurait impose de passer `API_URL` de `''` a
  `http://localhost:8000` et de configurer CORS pour de vrai.
- **FastAPI continue de servir le frontend** : aucun changement de code, mais garde frontend et
  backend couples, ce qui va a l'encontre de la motivation initiale.

L'option C n'exige **aucun changement de code** : tout passant par une seule origine, le
`API_URL = ''` actuel et les `fetch('/activites')` fonctionnent tels quels, et il n'y a aucun
CORS a gerer.

**Fichiers crees** : `docker-compose.yml`, `.env.example` et `.gitignore` a la racine,
`backend/Dockerfile`, `backend/.dockerignore`, `frontend/Dockerfile`,
`frontend/.dockerignore`, `frontend/nginx.conf`, `.devcontainer/devcontainer.json`.

### Decisions techniques de la conteneurisation

- **`python:3.14-slim` et non `alpine`** : Alpine utilise musl libc, ce qui obligerait a
  recompiler `bcrypt`, `psycopg2` et `Pillow` depuis les sources (build long et fragile).
- **Migrations au demarrage** : le backend lance `alembic upgrade head` avant uvicorn, avec
  `depends_on: condition: service_healthy` sur la base. Sans le healthcheck, la migration
  partirait avant que PostgreSQL accepte les connexions.
- **Volume nomme `pgdata`** : les donnees survivent a la destruction des conteneurs.
- **Peuplement non automatise** : les 3 scripts de seed restent manuels
  (`docker compose exec backend python scripts/seed.py`), pour ne pas ecraser des donnees
  reelles a chaque demarrage.
- **Docker-in-Docker et non Docker-out-of-Docker** pour le conteneur de dev : avec un simple
  socket monte, les bind mounts de `docker-compose.yml` seraient resolus sur le disque de
  l'hote, ou le projet clone dans le conteneur n'existe pas. DinD donne au daemon la meme
  vision du disque que les fichiers.

### Trois bugs rencontres au lancement, tous corriges

1. **`nginx.conf` exclu du contexte de build.** Il figurait dans `frontend/.dockerignore` pour
   ne pas etre servi comme fichier statique, mais le `Dockerfile` doit pouvoir le copier vers
   `/etc/nginx/conf.d/`. L'exclusion etait de toute facon inutile, puisque le montage de volume
   de compose ramene le fichier au runtime. Son exposition HTTP est bloquee par une regle
   `deny` dans nginx.conf.
2. **Chemin du volume PostgreSQL.** Depuis la version 18, l'image place les donnees dans un
   sous-dossier versionne : il faut monter sur `/var/lib/postgresql` et non
   `/var/lib/postgresql/data`. L'ancienne convention fait echouer le demarrage avec un message
   explicite. A necessite un `docker compose down -v` pour supprimer le volume invalide.
3. **Resolution DNS de nginx.** nginx resout les noms d'upstream **une seule fois au demarrage**.
   Un `docker compose restart backend` aurait provoque des 502 jusqu'au redemarrage de nginx.
   Corrige avec `resolver 127.0.0.11` (DNS interne de Docker) et un `proxy_pass` via variable,
   ce qui force une nouvelle resolution toutes les 10 secondes.

### Tache reportee explicitement

**Regrouper les routes API sous un prefixe `/api/`.** nginx doit actuellement lister chaque
prefixe (`/activites`, `/auth`, `/utilisateurs`, `/projets`, `/meteo`, `/health`, `/docs`) dans
une regex. Un prefixe unique permettrait une seule regle de proxy et supprimerait tout risque de
collision entre une route API et un fichier statique. Demande de modifier les routeurs FastAPI
et les appels `fetch()` du frontend, d'ou le report. Notee dans le README.

Egalement notee : faire tourner le conteneur backend avec un utilisateur non-root, laisse de
cote pour eviter les problemes de permissions sur les volumes montes.

### Diagnostic non lie : page non stylee sous Safari

Beaucoup de temps passe sur un faux bug. La page s'affichait sans CSS apres `Cmd+Shift+R`.
Cause : **dans Safari, `Cmd+Shift+R` active le mode Lecteur**, qui retire volontairement tout
le CSS. Le rechargement force est `Cmd+Option+R`. Le serveur n'a jamais ete en cause, ce que
l'onglet Reseau confirmait (seul le document HTML etait demande, aucun CSS ni JS).
