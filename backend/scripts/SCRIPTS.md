# Scripts du projet

Mémo des scripts disponibles et de leurs commandes, pour ne pas avoir à les rechercher.

Tout tourne en conteneur : les commandes se lancent **depuis la racine du projet**, là où se
trouve `docker-compose.yml`. Il n'y a plus d'environnement virtuel à activer.

La stack doit être démarrée (`docker compose up -d`) pour que `exec` fonctionne.

---

## Récapitulatif

| Script | Rôle | Écrit où | Rejouable sans risque |
|---|---|---|---|
| `seed.py` | Insère les 24 activités de démonstration | base | oui, ignore celles déjà présentes |
| `update_images.py` | Assigne la photo de couverture de chaque activité | base | oui |
| `seed_gallery.py` | Remplit la galerie photos des pages de détail | base | oui, remplace les photos existantes |
| `optimize_images.py` | Allège les photos trop lourdes | fichiers | oui, mais **cassé sous Docker**, voir plus bas |
| `verifier_photos.py` | Teste toutes les URL de photos distantes | rien | oui |
| `reset_password.py` | Réinitialise le mot de passe d'un compte | base | oui |

Aucun de ces scripts ne crée de compte utilisateur. Après un `docker compose down -v`, il faut
se réinscrire à la main depuis la page `auth.html`.

---

## seed.py

Insère les 24 activités de démonstration : 9 plages, 7 randonnées et 8 rhumeries, avec leurs
coordonnées GPS réelles. Les plages et randonnées ont en plus une table de détail
(`beach_details`, `hike_details`) ; les rhumeries n'en ont pas.

```bash
docker compose exec backend python scripts/seed.py
```

**Protection intégrée, fiche par fiche.** Le script compare chaque nom à ce qui existe déjà et
ignore les doublons. Il affiche par exemple `8 ajoutée(s), 16 déjà présente(s)`.

C'est ce qui permet d'ajouter une nouvelle catégorie à une base en service sans la détruire.
L'ancienne version s'arrêtait dès que la table contenait une seule ligne, ce qui obligeait à
tout vider pour ajouter quoi que ce soit.

**Il complète aussi les détails manquants.** Une fiche déjà présente mais sans sa ligne de
détails reçoit celle-ci, et une ligne existante voit ses **colonnes vides** remplies par les
valeurs du script. Une valeur déjà en base n'est jamais écrasée : le script complète, il ne
corrige pas. Pour changer une valeur existante, passer par SQL. C'est ce qui a permis d'ajouter les informations pratiques des
rhumeries (horaires, téléphone, site web) après leur création, sans les recréer.

**Il met aussi à jour les adresses.** L'adresse d'une fiche existante est réalignée sur celle
du script, car c'est lui qui en est la source. Les adresses postales des rhumeries ont été
relevées par géocodage inverse sur OpenStreetMap, à partir de leurs coordonnées GPS.

Les horaires, téléphones et sites web des rhumeries proviennent d'OpenStreetMap, complétés à
la main pour La Mauny, Dillon, Depaz, Saint-James et Clément. La
fréquentation n'y est documentée pour aucune distillerie : elle vaut `None` dans le script et
attend une saisie manuelle. Les champs d'accès et d'animaux existent encore mais ne sont plus
affichés sur la page de détail.

---

## update_images.py

Assigne à chaque activité sa photo de couverture, celle qui s'affiche sur les vignettes du
catalogue et de l'accueil.

```bash
docker compose exec backend python scripts/update_images.py
```

Deux sources de photos cohabitent dans ce script :

- les photos personnelles servies en local (`/assets/images/...`),
- des photos Wikimedia Commons sous licence Creative Commons, pour les lieux qui n'ont pas
  encore été photographiés.

Gorges de la Falaise utilise une photo de substitution : le badge « à modifier » reste affiché
sur sa vignette tant qu'une vraie photo du lieu n'a pas été ajoutée.

À relancer après avoir ajouté une photo ou modifié le dictionnaire `IMAGES` du script.

---

## seed_gallery.py

Remplit la table `poi_images`, c'est-à-dire la galerie photos des pages de détail. La première
photo de chaque liste occupe la grande case de la grille.

```bash
docker compose exec backend python scripts/seed_gallery.py
```

**Remplace** les photos existantes de chaque activité concernée au lieu de les ajouter, donc
aucun doublon possible. Onze activités sont couvertes : trois plages (Anse Noire, Anse Dufour,
Anse Couleuvre) dont les photos sont locales, et les huit rhumeries, dont les photos viennent de
Wikimedia Commons.

Deux dictionnaires alimentent le script : `GALLERIES` pour les photos locales et
`GALLERIES_RHUMERIES` pour les photos distantes. À relancer après avoir modifié l'un des deux.

---

## verifier_photos.py

Teste que toutes les URL de photos distantes enregistrées en base répondent encore.

```bash
docker compose exec backend python scripts/verifier_photos.py
```

Les photos des rhumeries sont hébergées par Wikimedia Commons : ce script détecte un lien mort,
par exemple si un fichier y est renommé ou supprimé. Il ne teste que les URL commençant par
`http` ; les fichiers locaux de `/assets/` sont servis par nginx et ne sont pas concernés.

Un échec `HTTP 429` signale une limitation de débit de Wikimedia sur ton adresse IP, pas un lien
mort. Le script espace déjà ses requêtes et retente, mais relance-le plus tard en cas de doute.

L'attribution des auteurs, exigée par les licences CC BY et CC BY-SA, est tenue dans
`CREDITS_PHOTOS.md`, à côté de ce fichier.

---

## reset_password.py

Fixe un nouveau mot de passe sur un compte, en cas d'oubli.

```bash
# Sans argument : liste les comptes, pour retrouver le bon email
docker compose exec -it backend python scripts/reset_password.py

# Avec l'email : demande le nouveau mot de passe, deux fois
docker compose exec -it backend python scripts/reset_password.py ton.email@exemple.fr
```

**Le `-it` est indispensable** : le script demande le mot de passe au clavier. Sans lui, il ne
peut pas le lire.

Le mot de passe ne s'affiche pas pendant la saisie, et n'apparaît ni dans l'historique du
terminal ni dans les arguments du processus. Il doit respecter les mêmes règles qu'à
l'inscription : 8 caractères minimum, 72 octets maximum, une majuscule, un chiffre. Ces règles
sont importées de `app/core/security.py`, la même source que l'inscription : le script ne
peut pas s'en écarter. Après trois saisies
invalides, le script abandonne sans rien modifier.

Une fois écrit, le mot de passe est relu en base et vérifié avec la même fonction que la
route de connexion.

**C'est un outil de développement, pas une fonctionnalité.** Il contourne toute
authentification : sa seule protection est l'accès au conteneur. Le site n'a pas encore de
fonction « mot de passe oublié », qui demanderait l'envoi d'un email. Voir le README.

---

## optimize_images.py

Redimensionne et recompresse les photos de `frontend/assets/images/` dont le côté le plus long
dépasse 1600 px, en JPEG qualité 85, progressif et optimisé.

Trois comportements utiles à connaître :

- **Idempotent.** Une photo déjà sous la limite est laissée intacte, donc aucune perte de
  qualité si le script est relancé.
- **Rotation EXIF appliquée dans les pixels.** Les photos de téléphone portent leur orientation
  dans une métadonnée, qui serait perdue au réenregistrement sans ce traitement.
- **Écriture sur place.** Les originaux restent récupérables via git.

### Attention : ce script ne fonctionne plus dans le conteneur

```bash
# NE MARCHE PAS
docker compose exec backend python scripts/optimize_images.py
```

Il affiche `Dossier introuvable : /frontend/assets/images` et **se termine avec un code de
sortie 0**, comme s'il avait réussi. Rien n'est optimisé.

La cause : le script calcule son chemin en remontant de trois dossiers depuis sa propre
position. Sur la machine, `backend/scripts/` remonte jusqu'à la racine du projet et trouve
`frontend/`. Dans le conteneur, le script est en `/app/scripts/`, donc trois crans plus haut
donnent `/frontend`, qui n'existe pas : seul `./backend` est monté dans le conteneur backend.

### Contournement en attendant la correction

Monter le dossier des images dans un conteneur jetable bâti sur l'image du backend, qui
contient déjà Pillow :

```bash
docker run --rm \
  -v "$(pwd)/frontend/assets/images:/frontend/assets/images" \
  -v "$(pwd)/backend/scripts:/app/scripts:ro" \
  projet-martinique-backend:latest \
  python /app/scripts/optimize_images.py
```

Le premier montage place les images là où le script les attend, le second lui donne accès à
son propre code.

**État des photos au 2026-09-14 :** 12 fichiers, 3,7 Mo au total, aucune au-dessus de 1600 px.
Il n'y a donc rien à optimiser pour l'instant. Le script redeviendra utile au prochain ajout de
photos prises au téléphone.

---

## Reconstruction complète après un `down -v`

`docker compose down -v` détruit le volume et donc toute la base. Pour repartir d'un site
fonctionnel, dans cet ordre :

```bash
docker compose up -d                                        # les migrations se jouent au démarrage
docker compose exec backend python scripts/seed.py          # les 24 activités
docker compose exec backend python scripts/update_images.py # les photos de couverture
docker compose exec backend python scripts/seed_gallery.py  # les galeries
```

Puis se réinscrire depuis `http://localhost:8080/auth.html` : aucun script ne recrée les
comptes utilisateurs.

---

## Commandes voisines, souvent utiles

Ce ne sont pas des scripts, mais elles se cherchent aussi souvent.

```bash
docker compose exec backend pytest                     # les 56 tests
docker compose exec backend alembic upgrade head       # migrations (déjà jouées au démarrage)
docker compose exec backend alembic revision --autogenerate -m "message"
docker compose exec db psql -U martinique -d martinique # session SQL interactive
```

Sauvegarder la base avant toute manipulation risquée :

```bash
docker compose exec -T db pg_dump -U martinique martinique > sauvegarde.sql
```
