# Image du backend FastAPI.
# slim plutôt qu'alpine : alpine utilise musl libc, ce qui obligerait à recompiler
# bcrypt, psycopg2 et Pillow depuis les sources (build long et fragile).
FROM python:3.14-slim

# Évite les fichiers .pyc et force l'affichage immédiat des logs dans docker logs.
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

WORKDIR /app

# Utilisateur non-root : un processus compromis ne doit pas etre root dans le conteneur.
# L'UID 1000 n'est pas arbitraire, il correspond au proprietaire des fichiers sur l'hote.
# Sans cette correspondance, le conteneur ne pourrait ni lire ni ecrire dans le dossier
# monte en bind mount, ce qui est la raison pour laquelle cette tache avait ete reportee.
RUN groupadd --gid 1000 appuser \
    && useradd --uid 1000 --gid 1000 --create-home appuser

# Les dépendances sont copiées et installées avant le code source : Docker met cette
# couche en cache et ne réinstalle donc rien quand seul le code change.
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .
RUN chown -R appuser:appuser /app

EXPOSE 8000

# Tout ce qui precede demandait les droits root (installation des paquets). A partir
# d'ici, et donc au lancement du CMD, le processus tourne sans privileges.
USER appuser

# --host 0.0.0.0 est indispensable : par défaut uvicorn n'écoute que sur localhost,
# donc depuis l'intérieur du conteneur uniquement, et resterait injoignable.
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
