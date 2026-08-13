# Agent Frontend v2 - Projet Martinique

## **ROLE**

Tu es l'agent frontend v2 du projet Martinique. Ta mission est d'améliorer
l'expérience utilisateur du site en affinant la navigation, l'état de
connexion et les détails visuels des pages existantes.

Le backend et les 8 pages sont déjà fonctionnels (v1 terminée). Tu ne touches
qu'aux fichiers JS et CSS existants dans `frontend/js/` et `frontend/css/`.
Tu ne modifies pas les fichiers HTML sauf pour de petits ajouts ciblés
(ex: un élément HTML pour le menu déroulant).

Règle obligatoire : après chaque modification, tester visuellement dans
le navigateur avant de passer à la suivante. Un commit par fichier modifié.

## **CE QU'IL DOIT CONSTRUIRE**

### 1. Navigation unifiée (toutes les pages)

**Deux états de nav selon la connexion :**
- Non connecté : Accueil / Catalogue / Météo / Planning IA / [Mon voyage en rouge]
- Connecté : Accueil / Catalogue / Météo / Planning IA / Mes projets + [bulle MD]

Le lien "Accueil" est à ajouter dans les nav-links sur toutes les pages
publiques (accueil.html, catalogue.html, meteo.html, detail.html).

**"Mon voyage" devient "Mes projets" (si connecté) :**
- Si connecté : remplacer le lien "Mon voyage" (style `.nav-cta`, fond rouge)
  par un lien "Mes projets" au même style que les autres liens de nav.
- Si non connecté : la nav reste identique à la maquette v1.

**Bulle de connexion (si connecté) :**
- Si connecté : afficher la bulle d'initiales `.nav-avatar` à droite
  des liens de nav, avec son menu déroulant.
- Si non connecté : ne pas afficher la bulle.

**Menu déroulant sur la bulle :**
- Un clic sur `.nav-avatar` ouvre un petit menu avec deux options :
  - "Mon espace personnel" : lien vers espace-personnel.html
  - "Se déconnecter" : supprime le JWT du localStorage et redirige
    vers accueil.html
- Un clic ailleurs sur la page ferme le menu.
- Style : cohérent avec le design system Madras (fond --nuit, texte blanc,
  accent --jaune au survol).

**Logo cliquable :**
- Sur toutes les pages, s'assurer que le logo pointe vers accueil.html
  (remplacer les href="#" par href="accueil.html" dans les fichiers HTML).

**Bouton "Se connecter" conditionnel (accueil.html uniquement) :**
- Si l'utilisateur est connecté, masquer le bouton "Se connecter" dans
  le hero (`.hero-actions`).

---

### 2. Page detail.html

**Bouton retour vers le catalogue :**
- Ajouter un lien "Retour au catalogue" dans le breadcrumb ou sous le
  hero (même style que le lien retour dans espace-personnel.html).
- Utiliser `history.back()` pour conserver la recherche et les filtres
  actifs dans le catalogue.

**Checkmark persistant sur "Ajouter à mon voyage" :**
- Au chargement de la page : appeler `GET /projets` pour vérifier si
  l'activité courante est déjà dans un projet de l'utilisateur connecté.
- Si oui : afficher immédiatement une icône checkmark à droite du bouton,
  dans le thème Madras (ex: ✓ en --vert sur fond --sable).
- Après un ajout réussi : remplacer le message de confirmation textuel
  par cette même animation checkmark.
- Le checkmark reste visible tant que l'activité est dans au moins un projet.
- Un clic sur le checkmark ouvre une petite bulle listant les noms des
  projets qui contiennent cette activité. Style cohérent avec le design
  system Madras. Un clic ailleurs ferme la bulle.

**Différenciation visuelle plage / randonnée :**
- Plage (beach) : accent --bleu (#1A5C8A) sur le hero et la sidebar.
- Randonnée (hike) : accent --vert (#1D7A4E) sur le hero et la sidebar.
- Modifier dynamiquement via JS en fonction du type retourné par l'API
  (classes ou variables CSS inline, pas de modification du CSS statique).

**Alerte sargasses conditionnelle :**
- Afficher le bloc `.alerte-card` uniquement si le type est `beach`.
  Le masquer pour les randonnées (`hike`).

---

### 3. Animations d'arrivée

- Appliquer la même animation d'entrée de page qu'accueil.html sur
  catalogue.html et meteo.html.
- Lire css/accueil.css et js/accueil.js pour identifier l'animation
  existante avant de l'implémenter ailleurs. Ne pas en inventer une nouvelle.
- Ne pas créer une nouvelle animation : réutiliser exactement ce qui existe.

---

## **DETAILS TECHNIQUES**

- Tous les changements de nav se font dans les fichiers JS de chaque page,
  en appelant une fonction `updateNav()` au chargement.
- La logique de nav étant identique sur toutes les pages, l'implémenter
  dans `js/auth-utils.js` sous forme de fonction exportée `updateNav()`
  appelée depuis chaque JS de page.
- Le menu déroulant de la bulle est injecté dans le DOM via JS (ajout
  HTML minimal autorisé) et positionné en absolu sous la bulle.
- Pour le checkmark : utiliser un élément `<span>` injecté à côté du
  bouton "Ajouter à mon voyage", pas de librairie externe.
- URL de base et headers : déjà dans `js/auth-utils.js`, ne pas dupliquer.

## **ORDRE D'EXECUTION**

1. **auth-utils.js** : ajouter la fonction `updateNav()` en premier,
   toutes les autres modifications en dépendent.
2. **accueil.html / js** : tester le bouton "Se connecter" conditionnel
   et la nav selon l'état de connexion.
3. **catalogue.html et meteo.html** : nav + animations d'arrivée.
4. **detail.html** : toutes les améliorations de la fiche activité.

A chaque étape : tester connecté ET non connecté, commiter, puis avancer.

## **VERIFICATION**

### Navigation (toutes les pages)
- [ ] Non connecté : Accueil / Catalogue / Météo / Planning IA / Mon voyage (rouge)
- [ ] Connecté : Accueil / Catalogue / Météo / Planning IA / Mes projets + bulle
- [ ] Bulle affiche les bonnes initiales
- [ ] Menu déroulant : "Mon espace personnel" redirige correctement
- [ ] Menu déroulant : "Se déconnecter" vide le JWT et redirige vers accueil.html
- [ ] Logo pointe vers accueil.html sur toutes les pages
- [ ] Bouton "Se connecter" masqué sur accueil.html si connecté

### detail.html
- [ ] Lien "Retour au catalogue" présent et fonctionnel (history.back())
- [ ] Checkmark visible au chargement si l'activité est déjà dans un projet
- [ ] Checkmark apparaît après un ajout réussi
- [ ] Clic sur le checkmark affiche la bulle avec les noms des projets
- [ ] Hero et sidebar en --bleu pour les plages, --vert pour les randonnées
- [ ] Bloc alerte sargasses absent sur les fiches randonnée

### Animations
- [ ] Animation d'arrivée identique à accueil.html sur catalogue.html
- [ ] Animation d'arrivée identique à accueil.html sur meteo.html

### Général
- [ ] Aucune erreur dans la console navigateur
- [ ] Chaque modification testée connecté ET non connecté
- [ ] La maquette reste visuellement identique sur les éléments non modifiés

## **EN CAS DE PROBLEME**

- Ne jamais inventer une solution incertaine : si un comportement, une
  structure de données ou un nom de classe CSS est inconnu, lire les
  fichiers concernés avant d'agir. Ne pas halluciner.
- Si l'animation d'accueil.html est complexe à isoler : signaler avant
  de créer une alternative.
- Si un élément HTML doit être ajouté pour le menu déroulant ou le
  checkmark : le faire, c'est dans le périmètre v2.
- Si une librairie JS externe semble nécessaire : demander avant d'installer.
- En cas de doute sur un comportement : poser la question, ne pas improviser.

## **JOURNAL DU PROJET**

A la fin de la mission, ajouter une entrée datée dans `backend/JOURNAL.md`
résumant ce qui a été modifié et les décisions techniques importantes prises.