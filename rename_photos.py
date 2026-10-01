"""
Renames photos everywhere at once: assets/img/, assets/img/thumbs/,
assets/img/originals_backup/, and every reference in the site's .html and .js files.
Optionally sets the photo's caption (alt text) at the same time.

Step 1 - make a list of photos to rename (run from the website's root folder):
    python rename_photos.py --init

  This writes renames.txt with one line per IMG_/PXL_ photo, like:
    IMG_1054.JPG ->

Step 2 - fill in new names (and optionally captions) in renames.txt:
    IMG_1054.JPG -> 2024_Wiring_Bay | Wiring the electronics bay, 2024
    IMG_1058.JPG -> 2024_Drivetrain_Test
    IMG_1179.JPG ->

  - The extension is added for you if you leave it off.
  - Lines with nothing after "->" are skipped, so you can do a few at a time.
  - The caption after "|" is optional.

Step 3 - preview, then run for real:
    python rename_photos.py --dry-run
    python rename_photos.py

Finished lines are removed from renames.txt, so it's safe to run again.
"""

import argparse
import html
import re
import sys
import uuid
from pathlib import Path

IMG_DIR = Path("assets/img")
PHOTO_FOLDERS = [IMG_DIR, IMG_DIR / "thumbs", IMG_DIR / "originals_backup"]
LIST_FILE = Path("renames.txt")
CODE_FILES = lambda: list(Path(".").glob("*.html")) + list(Path(".").glob("*.js"))
PHOTO_EXTS = {".jpg", ".jpeg", ".png"}
SAFE_NAME = re.compile(r"^[A-Za-z0-9_\-.]+$")


def init_list():
    if LIST_FILE.exists():
        sys.exit(f"{LIST_FILE} already exists. Delete it first if you want a fresh one.")
    names = sorted(
        p.name for p in IMG_DIR.iterdir()
        if p.is_file() and p.suffix.lower() in PHOTO_EXTS
        and re.match(r"^(IMG|PXL|DSC|DCIM|Screenshot)", p.name, re.I)
    )
    width = max((len(n) for n in names), default=0)
    lines = [f"{n:{width}} -> " for n in names]
    LIST_FILE.write_text(
        "# old name -> new name | optional caption\n"
        "# Leave the right side empty to skip a photo for now.\n" + "\n".join(lines) + "\n",
        encoding="utf-8",
    )
    print(f"Wrote {len(names)} photos to {LIST_FILE}. Fill in the new names, then run:")
    print("  python rename_photos.py --dry-run")


def parse_list():
    jobs, problems = [], []
    for num, raw in enumerate(LIST_FILE.read_text(encoding="utf-8").splitlines(), 1):
        line = raw.strip()
        if not line or line.startswith("#") or "->" not in line:
            continue
        old, rest = (s.strip() for s in line.split("->", 1))
        new, _, caption = (s.strip() for s in rest.partition("|"))
        if not new:
            continue  # not filled in yet

        old_ext = Path(old).suffix
        if not Path(new).suffix:
            new += old_ext
        elif Path(new).suffix.lower().replace("jpeg", "jpg") != old_ext.lower().replace("jpeg", "jpg"):
            problems.append(f"line {num}: {new} has a different file type than {old} "
                            "(renaming doesn't convert images)")
            continue

        if not SAFE_NAME.match(new):
            problems.append(f"line {num}: '{new}' - use only letters, numbers, _ - and . "
                            "(no spaces) so it works in URLs")
            continue
        jobs.append((num, old, new, caption))

    new_names = [j[2].lower() for j in jobs]
    for num, old, new, _ in jobs:
        if new_names.count(new.lower()) > 1:
            problems.append(f"line {num}: {new} is used more than once in the list")
    return jobs, problems


def rename_file(src, dst):
    # Two steps so case-only renames (photo.JPG -> photo.jpg) work on Windows/Mac
    temp = src.with_name(f".renaming-{uuid.uuid4().hex}{src.suffix}")
    src.rename(temp)
    temp.rename(dst)


def set_caption(text, new, caption):
    pattern = re.compile(r'<img\b[^>]*\bsrc="assets/img/' + re.escape(new) + r'"[^>]*>')
    safe = html.escape(caption, quote=True)

    def fix(match):
        tag = match.group(0)
        if re.search(r'\balt="[^"]*"', tag):
            return re.sub(r'\balt="[^"]*"', f'alt="{safe}"', tag, count=1)
        return tag.replace("<img", f'<img alt="{safe}"', 1)

    return pattern.subn(fix, text)


def main():
    parser = argparse.ArgumentParser(description="Rename photos everywhere at once.")
    parser.add_argument("--init", action="store_true", help="create renames.txt")
    parser.add_argument("--dry-run", action="store_true", help="show what would change")
    args = parser.parse_args()

    if not IMG_DIR.is_dir():
        sys.exit(f"Can't find {IMG_DIR}/ - run this from the website's root folder.")
    if args.init:
        return init_list()
    if not LIST_FILE.exists():
        sys.exit(f"No {LIST_FILE} yet. Run: python rename_photos.py --init")

    jobs, problems = parse_list()
    for p in problems:
        print("SKIPPED", p)

    code = {f: f.read_text(encoding="utf-8") for f in CODE_FILES()}
    done_lines = set()

    for num, old, new, caption in jobs:
        main_src = IMG_DIR / old
        if not main_src.exists():
            print(f"SKIPPED line {num}: {old} not found in {IMG_DIR}/")
            continue
        clash = IMG_DIR / new
        if clash.exists() and not clash.samefile(main_src):  # samefile allows case-only renames
            print(f"SKIPPED line {num}: {new} already exists")
            continue

        moved = []
        for folder in PHOTO_FOLDERS:
            src = folder / old
            if src.exists():
                if not args.dry_run:
                    rename_file(src, folder / new)
                moved.append(folder.name)

        refs = 0
        ref_pattern = re.compile(r"(assets/img/(?:thumbs/)?)" + re.escape(old) + r"""(?=["'?#)\s]|$)""")
        for f, text in code.items():
            text, n = ref_pattern.subn(lambda m: m.group(1) + new, text)
            if caption:
                text, _ = set_caption(text, new, caption)
            code[f] = text
            refs += n

        extra = f', caption "{caption}"' if caption else ""
        print(f"{old} -> {new}  ({', '.join(moved)}; {refs} reference(s) updated{extra})")
        if refs == 0:
            print(f"   note: {old} isn't used in any .html/.js file")
        done_lines.add(num)

    if args.dry_run:
        print("\nDry run only - nothing was changed. Run without --dry-run to apply.")
        return

    for f, text in code.items():
        f.write_text(text, encoding="utf-8")

    # Remove finished lines so the list only holds what's left to do
    remaining = [
        line for num, line in enumerate(LIST_FILE.read_text(encoding="utf-8").splitlines(), 1)
        if num not in done_lines
    ]
    LIST_FILE.write_text("\n".join(remaining) + "\n", encoding="utf-8")
    print(f"\nRenamed {len(done_lines)} photo(s). {LIST_FILE} now lists only what's left.")


if __name__ == "__main__":
    main()