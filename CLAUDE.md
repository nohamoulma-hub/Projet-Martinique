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

- Frontend  : HTML, CSS, JavaScript (vanilla, pas de framework). Seule librairie : Leaflet
  1.9.4 (cartes de la page Météo), chargée depuis unpkg avec empreinte d'intégrité
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
- ✅ 11 modèles SQLAlchemy : `User`, `PointOfInterest`, `PoiImage`, `BeachDetails`,
  `HikeDetails`, `RumDistilleryDetails`, `RestaurantDetails`, `TravelProject`,
  `TravelProjectItem`, `Conversation`, `ConversationMessage`
- ✅ PostgreSQL 18 en conteneur, 6 migrations Alembic appliquées
- ✅ 6 schémas Pydantic : `auth`, `meteo`, `point_of_interest`, `sargasses`,
  `travel_project`, `user`
- ✅ 8 routers, soit 31 routes : catalogue (avec filtre par commune et rayon), liste des
  communes, détail d'activité, activités à proximité (temps de trajet), inscription,
  connexion, profil, projets de voyage avec ajout et retrait d'activités, assistant de
  planning, health, météo (conditions,
  prévisions détaillées, carte animée, températures, plages, trait de côte) et
  sargasses (risque, nappes, odeurs H2S)
- ✅ 12 services : `auth_service` (JWT, bcrypt), `meteo_service` (Open-Meteo),
  `communes_service` (coordonnées des 34 communes, calcul de distance),
  `planning_service` (assistant IA : prompt, outils, garde-fous), et pour la météo et
  les sargasses : `meteo_animation_service`, `sargasses_service`, `h2s_service`,
  `coastline` (trait de côte, 6 façades), `collector_service` (collecte automatique),
  `cache_service` (stockage des données collectées), `trajets_service` (temps de
  trajet en voiture entre activités)
- ✅ 122 tests pytest, tous au vert
- ✅ Données : 101 points d'intérêt (70 plages, 7 randonnées, 8 rhumeries,
  16 restaurants), insérés par `scripts/seed.py`. 61 des plages viennent de
  martinique-tour.com (`scripts/plages_martinique_tour.json`) ; leur fréquentation n'y
  figure pas et vaut 0, affiché « Non renseigné »
- ❌ Aucune donnée pour les catégories logements, événements (hors v1)
- ❌ Aucune photo pour les restaurants : aucune image libre de droit trouvée

### Frontend
- ✅ 9 pages HTML avec CSS et JS séparés
- ✅ Toutes connectées à l'API via `fetch()`
- ✅ Routes protégées : token JWT stocké côté client, géré par `js/auth-utils.js`
- ✅ Page Météo en temps réel : carte Leaflet à onglets (Météo, Sargasses), prévisions
  dépliables, calendrier d'échouement, odeurs H2S, « Où me baigner aujourd'hui ? »
- ✅ Alertes sargasses réelles sur l'accueil, la fiche plage et le projet de voyage.
  Icônes, niveaux et appels communs dans `js/meteo-utils.js` (fichier partagé, comme
  `js/auth-utils.js`)

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

## **ASSISTANT IA DE PLANNING**

Modèle : **Claude Sonnet 5** (`claude-sonnet-5`), via le SDK officiel `anthropic`.
Clé dans `ANTHROPIC_API_KEY` (fichier `.env` à la racine), jamais dans le navigateur :
tous les appels passent par le backend.

Règles à ne pas contourner, toutes appliquées côté serveur :

- Connexion obligatoire sur toutes les routes `/api/planning`.
- 3 conversations par utilisateur et par jour, 30 messages par conversation,
  2 000 caractères par message, 5 secondes entre deux messages.
- Plafond de dépense global (`PLANNING_BUDGET_EUR`, 5 € par défaut) : au-delà,
  l'assistant renvoie 503. Le coût réel est calculé depuis les tokens consommés.
- Le modèle ne connaît le catalogue que par l'outil `rechercher_activites`, et
  `creer_planning` refuse tout identifiant absent de la base. C'est ce qui empêche
  matériellement l'invention d'activités.
- Le texte du voyageur est encadré par `<message_du_voyageur>` : il est lu comme une
  donnée, jamais comme une consigne.

## **MÉTÉO ET SARGASSES EN TEMPS RÉEL**

Développé depuis le 08/10/2026. Toutes les sources sont gratuites et sans clé API, pour
un usage non commercial, et doivent être citées sur le site :

| Donnée | Source | Rythme de collecte |
|---|---|---|
| Conditions, prévisions, températures, mer | Open-Meteo (CC BY 4.0) | 10 min à 2 h (plages : 2 h, quota de 10 000 appels par jour) |
| Nuages animés (2 h) | NASA GIBS, GOES-East GeoColor | 10 min |
| Pluie animée (2 h) | RainViewer (zoom 7 maximum) | 10 min |
| Fond de carte | Sentinel-2 cloudless par EOX | (tuiles servies par EOX) |
| Risque d'échouement du jour | NOAA AOML, Sargassum Inundation Risk | 6 h |
| Nappes au large | Indice AFAI de l'USF, diffusé par la NOAA (ERDDAP) | 6 h |
| Odeurs (H2S) | API Madininair (licence Etalab 2.0) | 1 h |
| Trait de côte | OpenStreetMap (ODbL) | figé dans `coastline.py` |
| Temps de trajet entre activités | OSRM de la FOSSGIS (routes OpenStreetMap) | vérifié chaque heure, recalculé si une activité bouge ou après 7 jours |

Règles :

- Aucune page n'appelle ces services directement : `collector_service` les relève en
  arrière-plan et écrit dans le cache (volume Docker `cache`), l'API lit le cache. Une
  route dont la donnée n'est pas encore collectée répond 503 avec un message en français.
- Les niveaux de sargasses suivent l'échelle NOAA : faible, vigilance, modéré, fort.
  Aujourd'hui = relevé NOAA ; les 4 jours suivants = estimation du site (dérive des
  nappes avec les courants et le vent prévus), toujours présentée comme telle.
- Les seuils et messages H2S sont ceux de Madininair et de l'ARS, cités tels quels.
- `COLLECTE_AUTO=false` coupe la collecte (fait automatiquement dans les tests).

## **JOURNAL DU PROJET**

Le fichier `backend/JOURNAL.md` contient l'historique chronologique de toutes
les décisions prises sur le projet. Chaque agent doit y ajouter une entrée
datée à la fin de sa mission, résumant ce qu'il a construit et les décisions
techniques importantes qu'il a prises.

## **CE QU'IL NE FAUT PAS FAIRE**

- ❌ Implémenter des fonctionnalités hors v1 (comparateur de vols, logements,
  événements). L'assistant IA de planning est développé depuis le 17/09/2026
  (voir `app/services/planning_service.py`), la météo et les sargasses en temps réel
  depuis le 08/10/2026 (voir la section dédiée ci-dessus).
- ❌ Modifier les modèles SQLAlchemy existants
- ❌ Modifier le schéma de base de données sans créer une migration Alembic
- ❌ Installer une nouvelle librairie sans demander d'abord
- ❌ Supprimer ou réécrire un fichier existant sans demander
- ❌ Créer des fichiers en dehors de la structure définie
- ❌ Utiliser le signe "—" (tiret cadratin) dans le code, les commentaires ou
  les messages
- ❌ Inventer une réponse en cas de doute : signaler ce qui est incertain et
  proposer de chercher une solution ensemble