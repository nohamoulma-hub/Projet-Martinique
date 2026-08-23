from logging.config import fileConfig

from sqlalchemy import engine_from_config
from sqlalchemy import pool

from alembic import context

from app.core.config import settings
from app.core.database import Base
# Importer chaque modèle pour qu'il s'enregistre sur Base.metadata.
# Sans cet import explicite, Python ne charge jamais ces fichiers, donc ces
# tables seraient invisibles pour Alembic lors d'un --autogenerate.
from app.models import (  # noqa: F401
    user,
    point_of_interest,
    beach_details,
    hike_details,
    travel_project,
    travel_project_item,
    poi_image,
)

# Objet central d'Alembic : donne accès au contenu de alembic.ini
# et pilote l'exécution de la migration en cours.
config = context.config

# On force l'URL de connexion depuis notre config applicative (.env),
# plutôt que de la dupliquer dans alembic.ini.
config.set_main_option("sqlalchemy.url", settings.database_url)

# Active les logs définis dans alembic.ini (les lignes "INFO [alembic...]"
# affichées dans le terminal lors d'une migration).
if config.config_file_name is not None:
    fileConfig(config.config_file_name)

# target_metadata = la liste de toutes les tables enregistrées par nos modèles
# (grâce aux imports ci-dessus). C'est ce qu'Alembic compare à l'état réel
# de la base pour générer automatiquement une migration (--autogenerate).
target_metadata = Base.metadata


def run_migrations_offline() -> None:
    """Mode "offline" : génère le SQL de la migration sans se connecter à la
    base. Utile pour produire un script .sql à exécuter manuellement ailleurs
    (ex: transmis à un administrateur de base de données), sans qu'Alembic
    ait besoin d'un accès direct à la base. Déclenché avec l'option --sql.
    """
    url = config.get_main_option("sqlalchemy.url")
    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
    )

    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online() -> None:
    """Mode "online" : le mode normal, utilisé dans la grande majorité des cas
    (c'est celui qu'on a utilisé pour créer nos 6 tables). Ouvre une vraie
    connexion à la base et applique la migration dans une transaction : si
    une erreur survient en cours de route, rien n'est appliqué à moitié.
    """
    connectable = engine_from_config(
        config.get_section(config.config_ini_section, {}),
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
    )

    with connectable.connect() as connection:
        context.configure(
            connection=connection, target_metadata=target_metadata
        )

        with context.begin_transaction():
            context.run_migrations()


# Alembic détecte tout seul si la commande lancée est en mode "offline"
# (option --sql) ou "online" (cas normal), et appelle la fonction correspondante.
if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
