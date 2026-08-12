# Configuration centralisée de l'app, lue depuis les variables d'environnement (.env).
# Évite de coder en dur des valeurs (clés API, URL de BDD...) qui changent selon l'environnement.
from pydantic import computed_field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env")

    app_name: str = "Martinique API"
    environment: str = "development"
    # Chaîne brute issue de .env (CORS_ORIGINS=a,b,c) ; cors_origins_list la transforme en liste.
    cors_origins: str = "http://localhost:5500"
    # URL de connexion à la base. SQLite pour l'instant (fichier local) ;
    # passera à une URL PostgreSQL plus tard sans changer le reste du code.
    database_url: str = "sqlite:///./martinique.db"
    # Clé secrète pour signer les tokens JWT : doit rester dans .env, jamais dans le code.
    jwt_secret_key: str = "changeme"
    jwt_expire_hours: int = 24

    @computed_field
    @property
    def cors_origins_list(self) -> list[str]:
        return [origin.strip() for origin in self.cors_origins.split(",")]


# Instance unique importée partout dans l'app (ex: app/main.py) pour accéder à la config.
settings = Settings()
