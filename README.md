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

```bash
# Activer l'environnement virtuel
source backend/venv/bin/activate

# Lancer le serveur
cd backend
uvicorn app.main:app --reload --port 8000
```

Le frontend est accessible sur `http://localhost:8000/site/accueil.html`  
La documentation API (Swagger) est sur `http://localhost:8000/docs`

---

## Ce qui est en place

### Backend

- 6 modèles SQLAlchemy : `User`, `PointOfInterest`, `BeachDetails`, `HikeDetails`, `TravelProject`, `TravelProjectItem`
- Modèle `PoiImage` pour les galeries photos (table `poi_images`)
- 18 routes API :
  - `GET /health`
  - `GET /activites` (pagination, filtres catégorie/recherche/tri)
  - `GET /activites/{id}` (détail + beach_details ou hike_details + galerie photos)
  - `POST /auth/inscription` et `POST /auth/connexion` (JWT)
  - `GET /utilisateurs/moi` et `PUT /utilisateurs/moi` (protégées)
  - `GET/POST/PUT/DELETE /projets` et `POST/DELETE /projets/{id}/activites` (protégées)
  - `GET /meteo` (données en direct via Open-Meteo, coordonnées Fort-de-France)
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

- [ ] Filtre par commune dans le catalogue
- [ ] Carte interactive des activités
- [ ] Avis et notes utilisateurs (étoiles + commentaires)
- [ ] Partage de projet de voyage (lien public)

### Données et photos

- [ ] Photos manquantes pour les activités : Gorges de la Falaise (badge "à modifier" en place)
- [ ] Photos de couverture pour les vignettes accueil restantes : Restaurants, Activités, Rhumeries, Logements
- [ ] Enrichir la galerie photos pour les autres plages et randonnées

### Catégories à développer

- [ ] Restaurants (aucune donnée en base pour l'instant)
- [ ] Rhumeries
- [ ] Activités nautiques / loisirs
- [ ] Logements
- [ ] Événements
- [ ] Cascades (catégorie dédiée, actuellement mappée sur Randonnées)

### Technique

- [ ] Alertes sargasses en temps réel (API Sargassum Watch System / USF identifiée)
- [ ] Assistant IA de planning (interface prête, logique à connecter)
- [ ] Comparateur de billets d'avion (Paris -> Fort-de-France)
- [ ] Migration SQLite -> PostgreSQL pour la mise en production
- [ ] Déploiement (hébergement à définir)

---

## Structure du projet

```
Projet-Martinique/
├── backend/
│   ├── alembic/           # migrations de base de données
│   ├── app/
│   │   ├── core/          # config et connexion BDD
│   │   ├── models/        # tables SQLAlchemy
│   │   ├── routers/       # endpoints FastAPI
│   │   ├── schemas/       # schémas Pydantic
│   │   └── services/      # logique métier et APIs externes
│   ├── scripts/           # scripts de peuplement de la base
│   ├── tests/             # 29 tests pytest
│   ├── JOURNAL.md         # historique chronologique des décisions
│   └── martinique.db      # base SQLite (dev)
└── frontend/
    ├── assets/images/     # photos locales par lieu
    ├── css/               # un fichier CSS par page
    ├── js/                # un fichier JS par page
    └── *.html             # 8 pages
```