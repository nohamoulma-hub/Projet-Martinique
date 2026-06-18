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

## Prochaines étapes envisagées

- Créer les tables réellement en base (via `Base.metadata.create_all` ou une première migration Alembic) pour valider le schéma.
- Brancher une première route avec données statiques pour valider le flow API avant d'introduire la BDD réelle.
