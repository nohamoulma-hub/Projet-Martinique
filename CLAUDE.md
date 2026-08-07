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

## **CONVENTIONS DE CODE**

### Langue
- Code (variables, fonctions, classes) : anglais
- Commentaires dans le code : français, courts et clairs
- Messages d'erreur retournés par l'API : français
- Commits : anglais

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