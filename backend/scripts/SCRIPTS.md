# Scripts du projet

Mémo des scripts disponibles et de leurs commandes, pour ne pas avoir à les rechercher.

Tout tourne en conteneur : les commandes se lancent **depuis la racine du projet**, là où se
trouve `docker-compose.yml`. Il n'y a plus d'environnement virtuel à activer.

La stack doit être démarrée (`docker compose up -d`) pour que `exec` fonctionne.

---

## Récapitulatif

| Script | Rôle | Écrit où | Rejouable sans risque |
|---|---|---|---|
| `seed.py` | Insère les 16 activités de démonstration | base | oui, refuse si la base est déjà peuplée |
| `update_images.py` | Assigne la photo de couverture de chaque activité | base | oui |
| `seed_gallery.py` | Remplit la galerie photos des pages de détail | base | oui, remplace les photos existantes |
| `optimize_images.py` | Allège les photos trop lourdes | fichiers | oui, mais **cassé sous Docker**, voir plus bas |

Aucun de ces scripts ne crée de compte utilisateur. Après un `docker compose down -v`, il faut
se réinscrire à la main depuis la page `auth.html`.

---

## seed.py

Insère les 16 activités de démonstration : 9 plages et 7 randonnées, avec leurs coordonnées GPS
réelles et leurs tables de détail (`beach_details`, `hike_details`).

```bash
docker compose exec backend python scripts/seed.py
```

**Protection intégrée.** Si la table `points_of_interest` contient déjà des lignes, le script
affiche `Base déjà peuplée (16 activités). Aucune action.` et s'arrête. Il ne crée donc jamais
de doublons, et tu peux le lancer sans crainte.

Pour repeupler volontairement, il faut d'abord vider la table, ce qui suppose de savoir ce que
tu fais.

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
aucun doublon possible. Trois activités sont couvertes pour l'instant : Anse Noire, Anse Dufour
et Anse Couleuvre.

À relancer après avoir modifié le dictionnaire `GALLERIES` du script.

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
docker compose exec backend python scripts/seed.py          # les 16 activités
docker compose exec backend python scripts/update_images.py # les photos de couverture
docker compose exec backend python scripts/seed_gallery.py  # les galeries
```

Puis se réinscrire depuis `http://localhost:8080/auth.html` : aucun script ne recrée les
comptes utilisateurs.

---

## Commandes voisines, souvent utiles

Ce ne sont pas des scripts, mais elles se cherchent aussi souvent.

```bash
docker compose exec backend pytest                     # les 29 tests
docker compose exec backend alembic upgrade head       # migrations (déjà jouées au démarrage)
docker compose exec backend alembic revision --autogenerate -m "message"
docker compose exec db psql -U martinique -d martinique # session SQL interactive
```

Sauvegarder la base avant toute manipulation risquée :

```bash
docker compose exec -T db pg_dump -U martinique martinique > sauvegarde.sql
```
