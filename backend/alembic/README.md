# Migrations — Projet Martinique

Ce dossier contient l'historique des migrations Alembic : chaque évolution du schéma de la base de données (création/modification de tables) est enregistrée ici comme un script versionné, plutôt que d'être appliquée à la main.

## Structure

- `env.py` — script exécuté à chaque commande Alembic. Connecte Alembic à notre app (`app.core.config.settings.database_url` pour l'URL, `app.core.database.Base.metadata` pour la liste des tables attendues).
- `script.py.mako` — modèle utilisé par Alembic pour générer le squelette de chaque nouvelle migration.
- `versions/` — les migrations elles-mêmes, dans l'ordre chronologique (chaque fichier référence la précédente via `down_revision`).

## Commandes utiles

Toujours depuis `backend/`, avec le venv activé (`source venv/bin/activate`).

**Générer une migration après avoir modifié un modèle** (ajout de colonne, nouvelle table...) :
```bash
alembic revision --autogenerate -m "description du changement"
```
⚠️ Relire le fichier généré dans `versions/` avant de l'appliquer — l'autogénération ne détecte pas tout (ex: renommage de colonne vu comme un drop + add).

**Appliquer les migrations en attente** :
```bash
alembic upgrade head
```

**Revenir en arrière d'une migration** :
```bash
alembic downgrade -1
```

**Voir où en est la base actuellement** :
```bash
alembic current
```

**Voir l'historique complet des migrations** :
```bash
alembic history
```

## Pourquoi Alembic plutôt que `Base.metadata.create_all()`

`create_all()` ne sait que créer les tables manquantes — il ne modifie jamais une table déjà existante. Dès qu'on touche à un modèle après avoir des données réelles en base, il faut un outil capable de faire évoluer le schéma sans perdre ces données : c'est le rôle d'Alembic. Voir `backend/JOURNAL.md` pour le détail de cette décision.