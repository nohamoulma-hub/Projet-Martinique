"""
Redimensionne et recompresse les photos de frontend/assets/images/.
Lancer depuis le dossier backend/ avec : python scripts/optimize_images.py

Les photos issues d'un téléphone font plusieurs Mo pour une résolution très
supérieure à ce que le site affiche. Ce script les ramène à une taille adaptée.

Idempotent : une photo déjà sous la limite est laissée intacte, donc aucune
perte de qualité en cas de relance. Les originaux restent récupérables via git.
"""
import sys
import os

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from pathlib import Path

from PIL import Image, ImageOps

# Côté le plus long, en pixels. 1600 reste net dans le lightbox sur écran Retina.
MAX_SIZE = 1600
# Qualité JPEG : 85 est le seuil au-delà duquel le gain visuel devient imperceptible.
QUALITY = 85

IMAGES_DIR = Path(__file__).parent.parent.parent / "frontend" / "assets" / "images"
EXTENSIONS = {".jpg", ".jpeg", ".png"}


def human(size_bytes):
    """Formate une taille en octets de façon lisible."""
    for unit in ("o", "Ko", "Mo"):
        if size_bytes < 1024:
            return f"{size_bytes:.0f} {unit}"
        size_bytes /= 1024
    return f"{size_bytes:.1f} Go"


def optimize_images():
    """Redimensionne toutes les photos dépassant MAX_SIZE sur leur côté long."""
    if not IMAGES_DIR.exists():
        print(f"Dossier introuvable : {IMAGES_DIR}")
        return

    files = sorted(f for f in IMAGES_DIR.rglob("*") if f.suffix.lower() in EXTENSIONS)
    if not files:
        print("Aucune image trouvée.")
        return

    total_before = total_after = 0
    resized = skipped = 0

    for path in files:
        before = path.stat().st_size
        total_before += before

        with Image.open(path) as img:
            # Applique la rotation EXIF des photos de téléphone dans les pixels,
            # sinon l'orientation serait perdue en réenregistrant.
            img = ImageOps.exif_transpose(img)

            if max(img.size) <= MAX_SIZE:
                total_after += before
                skipped += 1
                print(f"  inchangée : {path.name} ({img.size[0]}x{img.size[1]}, {human(before)})")
                continue

            old_size = img.size
            img.thumbnail((MAX_SIZE, MAX_SIZE), Image.LANCZOS)
            img.convert("RGB").save(
                path, "JPEG", quality=QUALITY, optimize=True, progressive=True
            )

        after = path.stat().st_size
        total_after += after
        resized += 1
        print(
            f"  OK : {path.name} "
            f"{old_size[0]}x{old_size[1]} -> {img.size[0]}x{img.size[1]}, "
            f"{human(before)} -> {human(after)}"
        )

    gain = 100 * (1 - total_after / total_before) if total_before else 0
    print(
        f"\n{resized} redimensionnée(s), {skipped} inchangée(s). "
        f"Total : {human(total_before)} -> {human(total_after)} ({gain:.0f} % de gain)."
    )


if __name__ == "__main__":
    optimize_images()
