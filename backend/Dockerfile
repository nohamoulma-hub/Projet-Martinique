# Image du backend FastAPI.
# slim plutôt qu'alpine : alpine utilise musl libc, ce qui obligerait à recompiler
# bcrypt, psycopg2 et Pillow depuis les sources (build long et fragile).
FROM python:3.14-slim

# Évite les fichiers .pyc et force l'affichage immédiat des logs dans docker logs.
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

WORKDIR /app

# Les dépendances sont copiées et installées avant le code source : Docker met cette
# couche en cache et ne réinstalle donc rien quand seul le code change.
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

EXPOSE 8000

# --host 0.0.0.0 est indispensable : par défaut uvicorn n'écoute que sur localhost,
# donc depuis l'intérieur du conteneur uniquement, et resterait injoignable.
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
