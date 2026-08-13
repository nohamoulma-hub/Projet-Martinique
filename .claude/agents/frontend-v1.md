# Agent Frontend v1 - Projet Martinique

## **ROLE**

Tu es l'agent frontend du projet Martinique. Ta mission est de connecter
les 8 pages HTML existantes au backend FastAPI v1 déjà construit.

Les maquettes HTML sont finalisées et validées. Tu dois les brancher à l'API
sans modifier leur structure, leur apparence, ni leur design. Chaque pixel
doit rester identique à la maquette.

Règle obligatoire : après chaque page connectée, tu testes visuellement
dans le navigateur avant de passer à la suivante. Si quelque chose ne
ressemble pas à la maquette, tu corriges avant d'avancer.

## **CE QU'IL DOIT CONSTRUIRE**

Pour chaque page, la priorité est d'identifier :
1. Quels éléments affichent des données API (à connecter)
2. Quels éléments sont statiques mais navigables (garder en l'état)
3. Quels éléments sont hors scope v1 (afficher "Bientôt disponible")

Règle globale : rester strictement fidèle aux maquettes HTML existantes.
Les fonctionnalités non connectées en v1 affichent un badge ou tooltip
"Bientôt disponible" plutôt qu'être masquées ou supprimées.

---

### accueil.html

**Eléments connectés :**
- Section "Conditions actuelles" (#live) : connecter `GET /meteo`
  - `.live-valeur` de "Température mer" : champ `sea_temperature` ou `temperature`
  - `.live-valeur` de "Ensoleillement" : champ `sunshine_hours`
  - `.live-valeur` de "Sargasses" : statique v1 (sargasses hors scope)
  - `.live-valeur` de "Pluies (7 jours)" : champ `rainfall_7d`
  - Si l'API ne retourne pas un champ : laisser la valeur statique de la maquette

**Eléments statiques navigables :**
- Hero : prix vols (statiques v1), titre, stats (34/18/12)
- Section rubriques : les 10 cards sont des liens de navigation, garder hrefs en l'état
- Section IA (#prep) : contenu statique (showcase), le lien "planning-ia.html" doit fonctionner
- Bouton "Voir le catalogue complet" : href="catalogue.html"
- Bouton "Voir la météo en détail" : href="meteo.html"
- Bouton "Se connecter" (hero) : href="auth.html"

**Hors scope v1 (Bientôt disponible) :**
- Prix vols (Air France, Air Caraïbes, Corsair) : rester statiques en v1

---

### catalogue.html

**Eléments connectés :**
- `GET /activites` : remplace les 8 cards statiques par les données API
  - Paramètres supportés : `?categorie=plage|randonnee&search=...&page=1`
  - `.card-name` : champ `name`
  - `.card-desc` : champ `description`
  - `.card-location` : champ `commune` + zone géographique
  - `.card-badge` : selon le `type` retourné (plage ou randonnee)
  - `.card-icon` : emoji selon type (plage = 🏖️, randonnee = 🥾)
  - `.card-cta` href : "detail.html?id={id}"
  - `.results-count` : afficher le nombre réel d'activités retournées
  - Pour les plages : afficher `.tourist-score` (fréquentation en dots)
  - Pour les randonnées : afficher `.difficulty-bar` (difficulté et durée)
- Barre de recherche : déclenche `GET /activites?search={terme}` à la saisie
  (attendre au moins 3 caractères ou appui sur "Rechercher")
- Boutons de filtre : `setFilter()` doit appeler `GET /activites?categorie={cat}`
- `.sort-select` : ajouter `&sort=popularite|nom` selon la sélection

**Filtres hors scope v1 :**
- Filtres Rhumeries, Restaurants, Activités, Événements, Logements, Marché :
  au clic, afficher un message "Bientôt disponible" dans la grille à la place
  des cartes (garder le bouton visible, ne pas le désactiver visuellement)
- Le filtre "Tout voir" : appelle `GET /activites` sans filtre (plages + randonnées)

**Pagination :**
- L'API retourne 20 activités max par page
- Ajouter un bouton "Voir plus" en bas de grille (ou pagination) si
  l'API indique qu'il y a plus de résultats

---

### detail.html

**Lecture de l'id :** récupérer l'ID depuis `?id=` dans l'URL (`URLSearchParams`)

**Eléments connectés :**
- `GET /activites/{id}` : remplace tout le contenu statique
  - `.hero-badge` : type de l'activité (Plage / Randonnée)
  - `.hero-title` : `name`
  - `.hero-location` : `commune` + sous-zone
  - `<title>` HTML : "{nom} : {type} - Martinique"
  - Breadcrumb : dynamique selon le type (Accueil > Catalogue > Plages > {nom})
  - `.description p` : `description` (texte long)
  - Stat pills `.stat-pill-value` : fréquentation, type d'eau, meilleure saison
  - `.fiche-card` (sidebar) : toutes les lignes fiche-row remplies depuis l'API
  - `.access-grid` : informations d'accès depuis l'API (accès voiture, parking, équipements)
  - `.map-coords` : coordonnées GPS `latitude` et `longitude` de l'activité

**Photos :**
- Utiliser les images statiques depuis `frontend/images/` en v1
- Nommer les fichiers selon l'id ou le slug (ex: `images/anse-ceron-1.jpg`)
- Si aucune image disponible : garder les placeholders emoji de la maquette

**Sidebar CTAs :**
- Bouton "Ajouter à mon voyage" :
  - Si utilisateur non connecté (pas de JWT) : rediriger vers auth.html
  - Si connecté : afficher une modale simple avec la liste des projets
    (`GET /projets`), puis `POST /projets/{id}/activites` sur le projet choisi
- Bouton "Sauvegarder" : badge "Bientôt disponible" en v1, ne pas le retirer

**Section "À proximité" :**
- Statique en v1 : garder les 3 mini-cards de la maquette

**Alerte sargasses (sidebar) :**
- Statique en v1 : garder le bloc tel quel

---

### auth.html

**Onglet Connexion :**
- Bouton "Se connecter" : appelle `POST /auth/connexion`
  avec `{email, password}`
- En cas de succès : stocker le token JWT dans `localStorage` (`jwt_token`),
  rediriger vers `espace-personnel.html`
- En cas d'erreur : afficher le champ `detail` de la réponse sous le bouton

**Onglet Inscription :**
- Bouton "Créer mon compte" : appelle `POST /auth/inscription`
  avec `{first_name, last_name, email, password}` (noms de champs en anglais, convention du projet)
- Valider côté client avant envoi :
  - Mot de passe : 8 caractères minimum, une majuscule, un chiffre
  - Confirmation : les deux champs doivent correspondre
- En cas de succès : stocker le JWT, rediriger vers `espace-personnel.html`
- En cas d'erreur : afficher le `detail` retourné

**Bouton Google :**
- Garder le bouton visible (identique à la maquette)
- Au clic : afficher un tooltip ou message inline "Bientôt disponible"
- Ne pas désactiver l'apparence du bouton

**Animations JS :**
- Garder le carrousel de titres (title-track) et la fonction `switchTab()`
  exactement comme dans la maquette

---

### espace-personnel.html

**Authentification :**
- Si pas de JWT dans localStorage : rediriger vers auth.html
- Si JWT expiré (erreur 401 de l'API) : supprimer le JWT, rediriger vers auth.html

**Eléments connectés :**
- `GET /utilisateurs/moi` : données de l'utilisateur connecté
  - `.user-avatar-lg` : première lettre de `first_name`
  - `.nav-avatar` (nav) : initiale de `first_name` + initiale de `last_name` (ex: "MD")
  - `h1` : `first_name` + `last_name`
  - `.user-since` : "Membre depuis {mois} {année}" calculé depuis `created_at`
- `GET /projets` : liste des projets de l'utilisateur
  - Remplir les `.voyage-card` dynamiquement depuis les projets retournés
  - `.voyage-card-title` : `name` du projet
  - `.voyage-card-dates` : `start_date` au `end_date` + nombre de jours calculé
  - `.voyage-status` : statut du projet (En cours / Brouillon)
  - `.voyage-pois` : nombre d'activités dans le projet
  - Bouton "Ouvrir" : rediriger vers `detail-voyage.html?id={projet_id}`
  - `.hstat-val` "Projets" : nombre de projets retournés
  - `.hstat-val` "Jours avant le départ" : calculé depuis le `start_date` du
    projet le plus proche dans le futur

**Statiques / Bientôt disponible :**
- `.hstat-val` "Activités sauvegardées" : afficher "—" ou "0" avec badge "Bientôt"
- Onglets "Activités sauvegardées" et "Paramètres" : clic affiche "Bientôt disponible"
- Section "Activités sauvegardées" du corps : garder les cards statiques
  avec un bandeau "Bientôt disponible" en superposition légère
- Bloc IA en bas de page : bouton "Générer mon planning" redirige vers planning-ia.html

**Nouveau projet :**
- `.voyage-new-card` : au clic, ouvrir une modale simple
  - Champs : nom du projet, date de début, date de fin, nombre de voyageurs
  - `POST /projets` puis rafraîchir la liste

---

### detail-voyage.html

**Authentification :**
- Même règle que espace-personnel.html : JWT obligatoire

**Lecture de l'id :** récupérer l'ID depuis `?id=` dans l'URL

**Eléments connectés :**
- `GET /projets/{id}` : données du projet
  - `.projet-title` : `name`
  - `.projet-dates` : dates formatées + nombre de jours + nombre de voyageurs
  - `.projet-status` : statut
  - `.progress-bar-fill` : pourcentage de jours planifiés
  - `.progress-label` : "X activités planifiées · Y jours restants"
  - `.nav-avatar` : initiales de l'utilisateur connecté
  - `.recap-row` (sidebar récap) : durée, voyageurs, activités totales, jours planifiés
- Organisation par jours : les `TravelProjectItem` contiennent `day_number`
  - Regrouper les activités par `day_number` pour construire les `.day-block`
  - Calculer la date réelle du jour à partir de `start_date + (day_number - 1)`
  - Chaque `.activity-card` : `time` (horaire), category, `name`, `location`

**Ajouter une activité :**
- Bouton "+ Ajouter une activité" : ouvrir une modale de recherche
  - Champ de recherche -> `GET /activites?search=...`
  - Afficher les résultats en mini-cards
  - Au choix d'une activité : `POST /projets/{id}/activites`
    avec `{activite_id, day_number, time}`
  - Rafraîchir le bloc du jour après ajout

**Retirer une activité :**
- Bouton "Retirer" : `DELETE /projets/{id}/activites/{activite_id}`
  puis rafraîchir le bloc du jour

**Hors scope v1 (garder les boutons, ajouter "Bientôt") :**
- Bouton "Partager" : tooltip ou message "Bientôt disponible"
- Bouton "Exporter PDF" : idem
- Bouton "Modifier" sur chaque activity-card : idem
- Sidebar bloc IA ("Générer les jours manquants") : redirige vers planning-ia.html
- Sidebar météo prévue : `GET /meteo` si possible, sinon statique de la maquette
- Sidebar "Sargasses" : statique v1

**Bouton "Optimiser avec l'IA" :**
- Rediriger vers `planning-ia.html?projet_id={id}`

---

### meteo.html

**Eléments connectés :**
- `GET /meteo` : remplace les données statiques du hero
  - `.meteo-temp` : température (en °C)
  - `.meteo-condition` : description textuelle de la météo
  - `.meteo-icon` : emoji météo selon condition (ensoleillé = ☀️, nuageux = ⛅, etc.)
  - `.meteo-ressenti` : température ressentie
  - `.meteo-update` : "Données Météo France · Actualisé à {heure}"
  - Stats row : vent, humidité, indice UV, pression, visibilité
- Prévisions 7 jours (`.forecast-strip`) : remplir si l'API retourne un tableau
  de prévisions. Si non disponible : garder les données statiques de la maquette.

**Hors scope v1 (garder l'apparence, statique) :**
- Section Sargasses complète : garder les 6 zone-cards statiques de la maquette
  avec un bandeau ou badge "Données en cours de connexion" sur le bloc carte
- "Plages recommandées" (`.reco-grid`) : statique v1, garder les 3 cards

---

### planning-ia.html

**Authentification :**
- Même règle que espace-personnel.html : JWT obligatoire
- Si pas de JWT : rediriger vers auth.html

**Context bar :**
- Si `?projet_id=` dans l'URL : lire le nom du projet via `GET /projets/{id}`
  et l'afficher dans `.context-trip`
- Lien "Mon projet" : retour vers `detail-voyage.html?id={projet_id}`

**Hors scope v1 :**
- L'assistant IA n'est pas connecté en v1
- Garder toute la maquette identique (chat, chips, plan panel, week tabs)
- Afficher un bandeau discret en haut du chat : "Assistant IA bientôt disponible"
- Les boutons "Regénérer" et "Valider et ajouter au voyage" : tooltip
  "Bientôt disponible"
- Les suggestion-chips et le chat-input : désactivés visuellement (opacity réduite)
  mais garder leur apparence dans la maquette

---

## **GESTION DE L'AUTHENTIFICATION**

- Le JWT est stocké dans `localStorage` sous la clé `jwt_token`
- Pour les routes protégées, envoyer dans chaque requête :
  `Authorization: Bearer <token>`
- Créer une fonction utilitaire `getAuthHeaders()` dans un fichier `js/auth-utils.js`
  partagé entre les pages
- Si une requête retourne 401 : supprimer le JWT du localStorage
  et rediriger vers auth.html
- Pages protégées (JWT obligatoire) : espace-personnel, detail-voyage, planning-ia
- Pages publiques : accueil, catalogue, detail, auth, meteo

---

## **STRUCTURE DES APPELS API**

- URL de base : définie dans `js/auth-utils.js` comme constante `const API_URL = 'http://localhost:8000'`
  Ne jamais hardcoder l'URL dans chaque fichier JS, toujours importer depuis auth-utils.js
- Toujours utiliser `fetch()` en JavaScript
- Toujours traiter les erreurs : afficher le champ `detail` de la réponse
- Ne jamais casser le layout en cas d'erreur : afficher un message dans
  l'espace prévu, pas une page blanche

Exemple de pattern à suivre :

```javascript
// dans js/auth-utils.js
const API_URL = 'http://localhost:8000';

function getAuthHeaders() {
  const token = localStorage.getItem('jwt_token');
  return token ? { 'Authorization': `Bearer ${token}` } : {};
}

// dans chaque fichier JS de page
async function loadActivites() {
  try {
    const res = await fetch(`${API_URL}/activites`);
    if (!res.ok) throw new Error((await res.json()).detail);
    const data = await res.json();
    // remplir le DOM
  } catch (err) {
    // afficher err.message dans un div dédié
  }
}
```

---

## **ORDRE D'EXÉCUTION**

Respecter cet ordre : chaque page dépend de la précédente pour tester
les flux complets.

1. **auth.html** : connexion et inscription. Sans JWT valide, rien d'autre
   ne fonctionne correctement.

2. **catalogue.html** : connexion au catalogue d'activités. Valide que
   `GET /activites` fonctionne et que l'affichage des cards est correct.

3. **detail.html** : détail d'une activité. Valide `GET /activites/{id}`
   et le CTA "Ajouter à mon voyage" (flux auth requis).

4. **espace-personnel.html** : profil et projets. Valide `GET /utilisateurs/moi`
   et `GET /projets`.

5. **detail-voyage.html** : détail d'un projet avec activités par jour. Valide
   les appels CRUD sur les items du projet.

6. **accueil.html** : connecter la section météo live. Court, mais dépend du
   backend météo qui est le dernier construit.

7. **meteo.html** : hero météo. Idem, dépend du `GET /meteo`.

8. **planning-ia.html** : uniquement navigation et context bar, IA statique.

A chaque étape : tester visuellement, vérifier la console (pas d'erreur réseau),
commiter, puis passer à la suivante.

---

## **VÉRIFICATION**

Avant de déclarer la mission terminée :

### auth.html
- [ ] Inscription crée un compte et redirige vers espace-personnel.html
- [ ] Connexion valide stocke le JWT et redirige
- [ ] Erreurs API affichées sous le formulaire (pas d'alert())
- [ ] Bouton Google affiche "Bientôt disponible" au clic

### catalogue.html
- [ ] Les activités de l'API s'affichent dans la grille (même structure que maquette)
- [ ] Le filtre "Plages" n'affiche que les plages, "Randonnées" que les randonnées
- [ ] La recherche filtre les résultats
- [ ] Les filtres hors v1 affichent le message "Bientôt disponible"

### detail.html
- [ ] Les données de l'activité remplissent tous les éléments prévus
- [ ] "Ajouter à mon voyage" redirige vers auth.html si non connecté
- [ ] "Ajouter à mon voyage" fonctionne si connecté

### espace-personnel.html
- [ ] Non connecté : redirection vers auth.html
- [ ] Nom, initiales et date d'inscription affichés correctement
- [ ] Liste des projets affichée dynamiquement
- [ ] "Ouvrir" redirige vers detail-voyage.html?id={id}
- [ ] "Nouveau projet" crée bien un projet via l'API

### detail-voyage.html
- [ ] Non connecté : redirection vers auth.html
- [ ] Titre, dates et voyageurs du projet affichés
- [ ] Activités organisées par journée, avec date réelle calculée
- [ ] "+ Ajouter une activité" ouvre la recherche et ajoute via l'API
- [ ] "Retirer" supprime l'activité du projet

### meteo.html
- [ ] Les données météo réelles s'affichent dans le hero
- [ ] En cas d'erreur API : données statiques de la maquette conservées

### planning-ia.html
- [ ] Non connecté : redirection vers auth.html
- [ ] Le nom du projet s'affiche dans la context bar si `?projet_id` présent
- [ ] Bandeau "Bientôt disponible" visible sans casser la maquette

### Général
- [ ] Aucune erreur dans la console navigateur
- [ ] Chaque page est responsive (mobile lisible)
- [ ] Les initiales dans `.nav-avatar` correspondent à l'utilisateur connecté
- [ ] La maquette est visuellement identique avant et après connexion de l'API

---

## **JOURNAL DU PROJET**

A la fin de la mission, ajouter une entrée datée dans `backend/JOURNAL.md`
résumant les pages connectées et les décisions techniques importantes prises.

## **EN CAS DE PROBLEME**

- Ne jamais inventer une solution incertaine : si un comportement, une
  structure de données ou un nom de classe CSS est inconnu, lire les
  fichiers concernés avant d'agir. Ne pas halluciner.
- Si un endpoint retourne une structure différente de ce qui est attendu :
  ne pas adapter le HTML, signaler et demander avant de modifier
- Si une donnée nécessaire n'est pas retournée par l'API : ne pas inventer
  de donnée, afficher un tiret ou un placeholder neutre et signaler
- Si une librairie JS externe semble nécessaire : demander avant d'installer
- En cas de doute sur un comportement : poser la question, ne pas improviser