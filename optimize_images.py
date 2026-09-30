"""
Shrinks the site's photos for the web and makes gallery thumbnails.

  - Every photo in assets/img/ larger than 2000px is resized to 2000px on its
    longest side and re-saved in place (same filename, so no HTML changes).
  - A 400px thumbnail of each photo is written to assets/img/thumbs/.
  - Phone photos are rotated upright using their orientation data.

Originals are copied to assets/img/originals_backup/ first. Don't commit that
folder to GitHub (add it to .gitignore) — it's just your safety net.

Usage (from the website's root folder):
    pip install pillow
    python optimize_images.py

Safe to run again after adding new photos: already-small images are left alone,
and thumbnails are regenerated.
"""

import shutil
from pathlib import Path

from PIL import Image, ImageOps

IMG_DIR = Path("assets/img")
THUMB_DIR = IMG_DIR / "thumbs"
BACKUP_DIR = IMG_DIR / "originals_backup"

MAX_SIZE = 2000      # longest side for full photos, in pixels
THUMB_SIZE = 400     # longest side for thumbnails
JPEG_QUALITY = 82

PHOTO_EXTS = {".jpg", ".jpeg", ".png"}
# Logos and sponsor graphics shouldn't be recompressed
SKIP_PREFIXES = ("logo", "sp_")


def save(img, path):
    ext = path.suffix.lower()
    if ext in (".jpg", ".jpeg"):
        img.convert("RGB").save(path, quality=JPEG_QUALITY, optimize=True, progressive=True)
    else:
        img.save(path, optimize=True)


def shrink(img, size):
    img = img.copy()
    img.thumbnail((size, size), Image.LANCZOS)
    return img


def main():
    if not IMG_DIR.is_dir():
        raise SystemExit(f"Can't find {IMG_DIR}/ — run this from the website's root folder.")

    THUMB_DIR.mkdir(exist_ok=True)
    BACKUP_DIR.mkdir(exist_ok=True)

    photos = [
        p for p in sorted(IMG_DIR.iterdir())
        if p.is_file()
        and p.suffix.lower() in PHOTO_EXTS
        and not p.name.lower().startswith(SKIP_PREFIXES)
    ]

    before_total = after_total = 0
    for path in photos:
        before = path.stat().st_size
        before_total += before

        with Image.open(path) as original:
            img = ImageOps.exif_transpose(original)  # fix sideways phone photos
            img.load()

        if max(img.size) > MAX_SIZE:
            backup = BACKUP_DIR / path.name
            if not backup.exists():
                shutil.copy2(path, backup)
            save(shrink(img, MAX_SIZE), path)
            note = "resized"
        else:
            note = "already small"

        save(shrink(img, THUMB_SIZE), THUMB_DIR / path.name)

        after = path.stat().st_size
        after_total += after
        print(f"{path.name:32} {before / 1e6:6.1f} MB -> {after / 1e6:5.2f} MB  ({note})")

    print(f"\n{len(photos)} photos: {before_total / 1e6:.1f} MB -> {after_total / 1e6:.1f} MB")
    print(f"Thumbnails written to {THUMB_DIR}/")
    print(f"Originals backed up in {BACKUP_DIR}/ (add it to .gitignore)")


if __name__ == "__main__":
    main()