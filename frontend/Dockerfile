# Image du frontend : nginx sert les fichiers statiques et relaie les appels API.
FROM nginx:alpine

# Remplace la configuration par défaut de nginx par la nôtre.
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Le site (HTML, CSS, JS, photos) est copié dans le dossier servi par nginx.
COPY . /usr/share/nginx/html

EXPOSE 80
