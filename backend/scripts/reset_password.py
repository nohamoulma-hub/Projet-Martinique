"""
Réinitialise le mot de passe d'un compte utilisateur.
Lancer depuis la racine du projet avec :
    docker compose exec -it backend python scripts/reset_password.py            # liste les comptes
    docker compose exec -it backend python scripts/reset_password.py <email>    # réinitialise

Le -it est indispensable : le script demande le mot de passe au clavier.

Outil de développement. Le site n'a pas encore de fonction « mot de passe oublié », et un
mot de passe haché en bcrypt ne peut pas être relu : la seule issue est d'en fixer un nouveau.
Le script contourne toute authentification, sa seule protection est l'accès au conteneur.
Il ne doit donc jamais être exposé comme une fonctionnalité du site.

Le mot de passe est saisi via getpass : il ne s'affiche pas à l'écran et n'apparaît ni dans
l'historique du terminal, ni dans les arguments du processus.
"""
import getpass
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.core.database import SessionLocal
# Les regles viennent du module de securite, comme pour l'inscription : il n'en existe
# qu'une seule definition, et le script ne peut pas s'en ecarter.
from app.core.security import erreur_mot_de_passe, hash_password, verify_password
from app.models.user import User


def lister_comptes(db):
    """Affiche les comptes existants pour aider à choisir le bon."""
    comptes = db.query(User).order_by(User.id).all()
    if not comptes:
        print("Aucun compte en base.")
        return
    print("Comptes existants :\n")
    for u in comptes:
        print(f"  {u.id:>3}  {u.email:<34} {u.first_name} {u.last_name}"
              f"  (créé le {u.created_at:%Y-%m-%d})")
    print("\nRelancer avec l'email du compte à réinitialiser.")


def reinitialiser(db, email):
    """Demande un nouveau mot de passe et l'enregistre, haché."""
    user = db.query(User).filter(User.email == email).first()
    if user is None:
        print(f"Aucun compte avec l'email {email}.\n")
        lister_comptes(db)
        sys.exit(1)

    print(f"Compte : {user.email} ({user.first_name} {user.last_name})")
    print("Règles : 8 caractères minimum, une majuscule, un chiffre.\n")

    for _ in range(3):
        mdp = getpass.getpass("Nouveau mot de passe : ")
        err = erreur_mot_de_passe(mdp)
        if err:
            print(f"  {err}\n")
            continue
        if getpass.getpass("Confirmer le mot de passe : ") != mdp:
            print("  Les deux saisies ne correspondent pas.\n")
            continue
        break
    else:
        print("Trois échecs, abandon. Aucune modification.")
        sys.exit(1)

    user.hashed_password = hash_password(mdp)
    db.commit()

    # Relecture depuis la base : on vérifie ce qui a réellement été écrit, avec la même
    # fonction que celle qu'utilise la route de connexion.
    db.refresh(user)
    if not verify_password(mdp, user.hashed_password):
        print("ERREUR : le mot de passe enregistré ne se vérifie pas.")
        sys.exit(1)

    print(f"\nMot de passe réinitialisé pour {user.email}.")
    print("Tu peux te connecter sur http://localhost:8080/auth.html")


if __name__ == "__main__":
    db = SessionLocal()
    try:
        if len(sys.argv) < 2:
            lister_comptes(db)
        else:
            reinitialiser(db, sys.argv[1].strip())
    finally:
        db.close()
