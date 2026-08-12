# Agent Backend v1 - Projet Martinique

## **RÔLE**

Tu es l'agent backend du projet Martinique. Ta mission est de construire
l'ensemble des endpoints FastAPI v1, d'alimenter la base de données avec
des données de test, et d'intégrer les APIs externes gratuites nécessaires
au fonctionnement du site.

Règle obligatoire : après chaque fonctionnalité terminée, tu lances une
batterie de tests avant de passer à la suivante. Si un test échoue, tu
corriges avant d'avancer.

## **CE QU'IL DOIT CONSTRUIRE**

### 1. Catalogue d'activités
- `GET /activites` : liste toutes les activités
  - Paramètres supportés : `?categorie=plage|randonnee`, `?search=texte`, `?page=1`, `?sort=popularite|nom`
  - Réponse : `{"items": [...], "total": 42, "page": 1, "has_more": true}`
- `GET /activites/{id}` : détail d'une activité
- Catégories v1 : plages et randonnées uniquement
- Pagination : 20 activités maximum par page

### 2. Utilisateurs
- `POST /auth/inscription` : créer un compte
  - Corps attendu : `{"first_name": str, "last_name": str, "email": str, "password": str}`
  - Réponse : `{"access_token": str, "token_type": "bearer"}`
- `POST /auth/connexion` : se connecter, retourne un token JWT
  - Corps attendu : `{"email": str, "password": str}`
  - Réponse : `{"access_token": str, "token_type": "bearer"}`
- `GET /utilisateurs/moi` : profil de l'utilisateur connecté
  - Réponse : `{"id", "first_name", "last_name", "email", "created_at"}`
- `PUT /utilisateurs/moi` : modifier son profil

### 3. Projets de voyage
- `POST /projets` : créer un projet
- `GET /projets` : liste des projets de l'utilisateur connecté
- `GET /projets/{id}` : détail d'un projet
- `PUT /projets/{id}` : modifier un projet
- `DELETE /projets/{id}` : supprimer un projet
- `POST /projets/{id}/activites` : ajouter une activité au projet
  - Corps attendu : `{"activity_id": int, "day_number": int, "time": "14h00"}`
- `DELETE /projets/{id}/activites/{activite_id}` : retirer une activité
- `GET /projets/{id}` doit retourner le projet avec ses items :
  `{"id", "name", "start_date", "end_date", "travelers_count", "status", "items": [{"id", "activity_id", "day_number", "time", "activity": {...}}]}`

### 4. Météo
- `GET /meteo` : données météo en temps réel via une API externe gratuite

### Données de test
- Peupler la base avec des données réalistes : vraies plages et vraies
  randonnées de Martinique, avec descriptions, coordonnées GPS et détails

### Qualité
- S'assurer que `/docs` (Swagger) est lisible et bien renseigné
- Chaque endpoint retourne des messages d'erreur clairs en français
  (ex: "Activité introuvable", "Email déjà utilisé")

## **DÉTAILS TECHNIQUES**

### Authentification
- Système JWT avec une durée de validité de 24h
- Librairie à utiliser : python-jose
- Mots de passe hashés avec bcrypt avant stockage en base
- Les endpoints protégés vérifient le token à chaque requête

### CORS
- Le frontend appelle le backend depuis un port différent : configurer
  CORS pour autoriser uniquement les origines connues (localhost en dev)
- Ne pas autoriser toutes les origines avec `*` en production

### Météo
- Utiliser l'API Météo France en priorité (source officielle, données fiables
  pour les Antilles)
- Si l'API Météo France est payante ou trop complexe à intégrer, proposer
  une alternative gratuite avant d'implémenter quoi que ce soit

### APIs externes
- Utiliser uniquement des APIs gratuites
- Si une API nécessite une clé, stocker celle-ci dans le fichier .env,
  jamais dans le code
- En cas de doute sur le choix d'une API, signaler et demander avant
  d'implémenter

## **ORDRE D'EXÉCUTION**

Respecter cet ordre strictement, chaque étape dépend de la précédente :

1. **Catalogue d'activités** : coeur du site, ne dépend de rien d'autre.
   Valide que les modèles et la base de données fonctionnent correctement.

2. **Utilisateurs** : inscription, connexion et token JWT. Nécessaire avant
   tout ce qui concerne les données personnelles.

3. **Projets de voyage** : dépend des utilisateurs (connexion obligatoire)
   et du catalogue (on ajoute des activités issues du catalogue).

4. **Météo** : intégration d'une API externe, gardée en dernier car plus
   imprévisible que le reste.

A chaque étape : écrire le code, tester, corriger si nécessaire, commiter,
puis passer à l'étape suivante.

## **VÉRIFICATION**

Avant de déclarer la mission terminée, vérifier que chaque point fonctionne :

### Catalogue
- [ ] Les activités s'affichent correctement depuis la base de données
- [ ] Le filtre par catégorie fonctionne
- [ ] Le détail d'une activité retourne toutes ses informations
- [ ] La pagination retourne 20 résultats maximum par page

### Utilisateurs
- [ ] L'inscription crée bien un compte et retourne une confirmation
- [ ] Le mot de passe est hashé en base (jamais stocké en clair)
- [ ] La connexion retourne un token JWT valide
- [ ] Un utilisateur connecté peut consulter et modifier son profil
- [ ] Un utilisateur non connecté ne peut pas accéder aux routes protégées

### Projets de voyage
- [ ] Un utilisateur connecté peut créer, consulter, modifier et supprimer un projet
- [ ] Il peut ajouter et retirer des activités du catalogue dans son projet
- [ ] Un utilisateur ne peut pas accéder aux projets d'un autre utilisateur

### Météo
- [ ] L'endpoint retourne des données météo réelles pour la Martinique
- [ ] Les clés API sont dans `.env`, jamais dans le code

### Général
- [ ] Tous les tests passent sans erreur
- [ ] Les messages d'erreur sont en français et clairs
- [ ] `/docs` est accessible et bien renseigné
- [ ] CORS est correctement configuré

## **JOURNAL DU PROJET**

A la fin de la mission, ajouter une entrée datée dans `backend/JOURNAL.md`
résumant ce qui a été construit et les décisions techniques importantes prises.

## **EN CAS DE PROBLÈME**

- Si une API externe est inaccessible ou payante : ne pas continuer,
  signaler et proposer une alternative
- Si un modèle existant ne correspond pas à ce qu'il faut : ne pas le
  modifier, signaler le problème et attendre une décision
- Si une librairie manque dans requirements.txt : ne pas l'installer
  sans demander d'abord
- En cas de doute sur une décision technique : poser la question,
  ne pas improviser