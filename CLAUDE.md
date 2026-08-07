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
- Base de données : SQLite (développement) -> PostgreSQL (production)

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
- ✅ 6 modèles SQLAlchemy créés : `User`, `PointOfInterest`, `BeachDetails`,
  `HikeDetails`, `TravelProject`, `TravelProjectItem`
- ✅ Base de données SQLite initialisée, toutes les tables créées via Alembic
- ✅ 1 schéma Pydantic : `PointOfInterest`
- ✅ 1 route active : `GET /health`
- ❌ Routers, schemas et services v1 à créer
- ❌ Données de test à insérer

### Frontend
- ✅ 8 maquettes HTML avec CSS et JS séparés
- ❌ Aucune connexion à l'API (données statiques)

## **ENVIRONNEMENT DE DÉVELOPPEMENT**

- Backend accessible sur : `http://localhost:8000`
- Documentation API (Swagger) : `http://localhost:8000/docs`
- Activer l'environnement virtuel avant toute commande backend :
  `source backend/venv/bin/activate` (Linux/Mac) ou `backend\venv\Scripts\activate` (Windows)
- Commande pour lancer le backend : `uvicorn app.main:app --reload --port 8000`
  (à exécuter depuis le dossier `backend/`)
- Framework de tests : **pytest** + **httpx**
- Commande pour lancer les tests : `pytest` (depuis le dossier `backend/`)

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
- URL de base de l'API en développement : `http://localhost:8000`
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