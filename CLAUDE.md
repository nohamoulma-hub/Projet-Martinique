# CLAUDE.md - Projet Martinique

## **DESCRIPTION DU PROJET**

Site web touristique dédié à la Martinique, conçu pour faciliter la planification
d'un voyage sur l'île. Il s'adresse à tous types de voyageurs (tous âges), avec une
interface pensée pour une navigation simple et fluide.

**Fonctionnalités prévues :**
- Catalogue d'activités (plages, randonnées, rhumeries...) avec fiches descriptives
- Prix moyens des billets d'avion Paris -> Fort-de-France (Air France, Air Caraïbes, Corsair)
- Météo et alertes sargasses en temps réel pour les voyageurs sur place
- Assistant IA de planification : génère un programme personnalisé selon les goûts
  du client, son budget, la durée et la période de séjour
- Comptes utilisateurs avec projets de voyage sauvegardables et modifiables

## **STACK TECHNIQUE**

- Frontend  : HTML, CSS, JavaScript (vanilla, pas de framework)
- Backend   : Python + FastAPI
- ORM       : SQLAlchemy
- Migrations: Alembic
- Base de données : PostgreSQL 18 (développement et production)
- Conteneurisation : Docker Compose, 3 services (`db`, `backend`, `frontend`)
- Serveur web : nginx, sert le statique et relaie l'API

## **STRUCTURE DES DOSSIERS**

```
Projet-Martinique/
├── backend/
│   ├── alembic/          # migrations de base de données
│   ├── app/
│   │   ├── core/         # config et connexion BDD
│   │   ├── models/       # tables SQLAlchemy
│   │   ├── routers/      # endpoints FastAPI
│   │   ├── schemas/      # schémas Pydantic
│   │   └── services/     # logique métier et APIs externes
│   ├── .env              # variables d'environnement (non versionné)
│   ├── martinique.db     # base SQLite (dev)
│   └── requirements.txt
└── frontend/
    ├── css/              # un fichier par page
    ├── js/               # un fichier par page
    └── *.html            # 8 pages
```

## **ÉTAT ACTUEL**

### Backend
- ✅ 9 modèles SQLAlchemy : `User`, `PointOfInterest`, `PoiImage`, `BeachDetails`,
  `HikeDetails`, `RumDistilleryDetails`, `RestaurantDetails`, `TravelProject`,
  `TravelProjectItem`
- ✅ PostgreSQL 18 en conteneur, 5 migrations Alembic appliquées
- ✅ 5 schémas Pydantic : `auth`, `meteo`, `point_of_interest`, `travel_project`, `user`
- ✅ 6 routers, soit 12 routes : catalogue (avec filtre par commune et rayon), liste des
  communes, détail d'activité, inscription, connexion,
  profil, projets de voyage avec ajout et retrait d'activités, météo, health
- ✅ 3 services : `auth_service` (JWT, bcrypt), `meteo_service` (API externe),
  `communes_service` (coordonnées des 34 communes, calcul de distance)
- ✅ 60 tests pytest, tous au vert
- ✅ Données de démonstration : 40 points d'intérêt (9 plages, 7 randonnées,
  8 rhumeries, 16 restaurants), insérés par `scripts/seed.py`
- ❌ Aucune donnée pour les catégories logements, événements (hors v1)
- ❌ Aucune photo pour les restaurants : aucune image libre de droit trouvée

### Frontend
- ✅ 9 pages HTML avec CSS et JS séparés
- ✅ Toutes connectées à l'API via `fetch()`
- ✅ Routes protégées : token JWT stocké côté client, géré par `js/auth-utils.js`

## **ENVIRONNEMENT DE DÉVELOPPEMENT**

- Backend accessible sur : `http://localhost:8000`
- Documentation API (Swagger) : `http://localhost:8080/api/docs`
- Site web (nginx) : `http://localhost:8080`
- Base de données : `localhost:5432`, base `martinique`, utilisateur `martinique`
- Tout tourne en conteneur, il n'y a plus d'environnement virtuel à activer.
  Lancer la stack depuis la racine du projet : `docker compose up -d`
- Les commandes backend passent par le conteneur :
  `docker compose exec backend <commande>`
- Framework de tests : **pytest** + **httpx**
- Commande pour lancer les tests : `docker compose exec backend pytest`
- Migrations : `docker compose exec backend alembic upgrade head`
  (déjà jouées automatiquement au démarrage du backend)
- Peuplement : `docker compose exec backend python scripts/seed.py`
- ⚠️ `docker compose down -v` détruit le volume et donc toutes les données.
  `docker compose down` sans le `-v` est sans danger.

## **DESIGN SYSTEM FRONTEND**

Toutes les pages utilisent le design system "Madras". Ne pas s'en écarter.

### Couleurs
- `--rouge : #C8392B`
- `--jaune : #F0B429`
- `--vert : #1D7A4E`
- `--bleu : #1A5C8A`
- `--sable : #F5EDD8`
- `--nuit : #0D1F2D`

### Typographies
- Titres : Playfair Display
- Corps : DM Sans

### Éléments communs
- Logo : fleur SVG (5 ellipses roses #D4607A + centre jaune #F0B429)
- Nav : sticky, hauteur 64px, barre de progression madras en haut
- Bouton principal : fond `--rouge`, texte blanc
- Bouton secondaire : fond `--jaune`, texte `--nuit`
- Toutes les pages doivent être responsive (lisibles et utilisables sur mobile)

## **CONVENTIONS DE CODE**

### Langue
- Code (variables, fonctions, classes) : anglais
- Commentaires dans le code : français, courts et clairs
- Messages d'erreur retournés par l'API : français
- Commits : anglais, format conventional commits (ex: `feat:`, `fix:`, `docs:`)

### Nommage
- Fichiers Python : `snake_case` (ex: `travel_project.py`)
- Fichiers frontend : `kebab-case` (ex: `detail-voyage.html`)
- Variables et fonctions : `snake_case` (ex: `get_user`)
- Classes : `PascalCase` (ex: `TravelProject`)
- Tables en base : `snake_case` pluriel (ex: `travel_projects`)

### Commentaires
- Un commentaire court au-dessus de chaque fonction pour expliquer son rôle
- Pas de blocs de commentaires longs
- Expliquer le pourquoi quand ce n'est pas évident, pas le quoi

### Variables d'environnement
- Toute nouvelle variable ajoutée dans `.env` doit aussi être ajoutée
  dans `.env.example` (sans la valeur réelle)
- Jamais de secrets ou clés API dans le code

## **GIT**

- Branche principale : `main` (on travaille directement dessus, pas de feature branches)
- Un commit par fichier créé ou modifié
- Format des commits : conventional commits en anglais (ex: `feat:`, `fix:`, `docs:`, `chore:`)

## **COMMUNICATION FRONTEND / BACKEND**

- Le frontend appelle le backend via `fetch()` en JavaScript
- URL de base de l'API : `/api` (toutes les routes vivent sous ce préfixe).
  Le frontend passe par nginx sur la même origine, donc `API_URL = '/api'` suffit
  et aucune configuration CORS n'est nécessaire. Cette constante est définie une
  seule fois dans `frontend/js/auth-utils.js`.
- Format des erreurs retournées par l'API : `{"detail": "message d'erreur en français"}`
- Pour les routes protégées, le frontend envoie le token JWT dans le header :
  `Authorization: Bearer <token>`

## **JOURNAL DU PROJET**

Le fichier `backend/JOURNAL.md` contient l'historique chronologique de toutes
les décisions prises sur le projet. Chaque agent doit y ajouter une entrée
datée à la fin de sa mission, résumant ce qu'il a construit et les décisions
techniques importantes qu'il a prises.

## **CE QU'IL NE FAUT PAS FAIRE**

- ❌ Implémenter des fonctionnalités hors v1 (IA de planning, sargasses,
  comparateur de vols, logements, événements)
- ❌ Modifier les modèles SQLAlchemy existants
- ❌ Modifier le schéma de base de données sans créer une migration Alembic
- ❌ Installer une nouvelle librairie sans demander d'abord
- ❌ Supprimer ou réécrire un fichier existant sans demander
- ❌ Créer des fichiers en dehors de la structure définie
- ❌ Utiliser le signe "—" (tiret cadratin) dans le code, les commentaires ou
  les messages
- ❌ Inventer une réponse en cas de doute : signaler ce qui est incertain et
  proposer de chercher une solution ensemble