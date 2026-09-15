/* Pose l'etat de connexion sur <html> AVANT le premier rendu de la page.
 *
 * A charger dans le <head>, sans defer ni async : le navigateur executera alors ce
 * fichier avant d'analyser le <body>, donc avant d'afficher quoi que ce soit.
 *
 * Le token est dans localStorage, donc lisible sans reseau : inutile d'attendre le
 * JS de bas de page, qui ne s'execute qu'apres le premier affichage et laissait
 * apparaitre la nav "non connecte" pendant une seconde a chaque changement de page.
 *
 * Les regles qui exploitent ces classes sont dans css/nav.css. */
(function () {
  var etat = 'deconnecte';
  // localStorage peut lever une exception en navigation privee ou si les donnees
  // de site sont bloquees : on considere alors le visiteur comme non connecte.
  try {
    if (localStorage.getItem('jwt_token')) etat = 'connecte';
  } catch (e) {}
  document.documentElement.classList.add(etat);
})();
