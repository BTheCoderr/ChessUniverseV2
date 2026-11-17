#!/usr/bin/env python3
"""Rebuild every Chess Universe logo asset from the user-supplied gold knight.

The master is an opaque 1024×1024, high-quality AVIF derived from the user's
original gold/cosmic PNG. No lime-colored or synthetic replacement imagery.
Outputs are fully deterministic and validated by both web and mobile CI.

Usage:
  python scripts/sync-brand-icons.py --write
  python scripts/sync-brand-icons.py --check
"""
import argparse
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parent.parent
MASTER = ROOT / "public/brand/gold-cosmic-master.avif"
NAVY = (8, 21, 45)
GOLD = (242, 192, 100)
IVORY = (249, 243, 232)

PNG_TARGETS = {
    "public/brand/favicon-64.png": 64,
    "public/brand/knight-icon-192.png": 192,
    "public/brand/knight-icon-512.png": 512,
    "public/brand/apple-touch-icon.png": 180,
    "apps/mobile/assets/logo-mark.png": 256,
    "apps/mobile/assets/icon.png": 1024,
}
JPG_TARGETS = {
    "public/brand/knight-emblem-160.jpg": 160,
    "public/brand/knight-emblem-512.jpg": 512,
}


def source_image():
    with Image.open(MASTER) as original:
        if original.size != (1024, 1024):
            raise ValueError(f"Gold logo master must be 1024x1024, got {original.size}")
        image = original.convert("RGBA")
        canvas = Image.new("RGBA", image.size, NAVY + (255,))
        canvas.alpha_composite(image)
        # RGB means iOS icon is strictly opaque, as App Store requires.
        return canvas.convert("RGB")


def og_image(icon):
    # A share preview that features the same golden artwork, not old lime assets.
    canvas = Image.new("RGB", (1200, 630), NAVY)
    art = icon.resize((580, 580), Image.Resampling.LANCZOS)
    canvas.paste(art, (18, 25))
    draw = ImageDraw.Draw(canvas)
    font_file = "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"
    subtitle_file = "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf"
    title_font = ImageFont.truetype(font_file, 64)
    sub_font = ImageFont.truetype(subtitle_file, 29)
    draw.text((605, 210), "CHESS", font=title_font, fill=GOLD)
    draw.text((605, 292), "UNIVERSE", font=title_font, fill=GOLD)
    draw.text((608, 394), "Play  ·  Learn  ·  Compete", font=sub_font, fill=IVORY)
    return canvas


def build_assets():
    master = source_image()
    assets = {
        path: (master.resize((size, size), Image.Resampling.LANCZOS), "PNG")
        for path, size in PNG_TARGETS.items()
    }
    assets.update({
        path: (master.resize((size, size), Image.Resampling.LANCZOS), "JPEG")
        for path, size in JPG_TARGETS.items()
    })
    assets["public/brand/og-image.jpg"] = (og_image(master), "JPEG")
    return assets


def main():
    parser = argparse.ArgumentParser()
    group = parser.add_mutually_exclusive_group(required=True)
    group.add_argument("--write", action="store_true")
    group.add_argument("--check", action="store_true")
    opts = parser.parse_args()
    issues = []
    for rel_path, (image, fmt) in build_assets().items():
        target = ROOT / rel_path
        if opts.write:
            target.parent.mkdir(parents=True, exist_ok=True)
            save_args = {"optimize": True}
            if fmt == "JPEG":
                save_args.update({"quality": 94, "subsampling": 0})
            image.save(target, fmt, **save_args)
            print(f"Generated {rel_path}: {image.width}x{image.height}, RGB")
        elif not target.exists():
            issues.append(f"{rel_path}: missing")
        else:
            with Image.open(target) as old:
                if old.size != image.size or old.mode != "RGB":
                    issues.append(f"{rel_path}: unexpected dimensions or alpha channel")
                elif fmt == "PNG" and old.tobytes() != image.tobytes():
                    issues.append(f"{rel_path}: not derived from gold master")
                elif fmt == "JPEG":
                    # JPEG is lossy, so compare the original file with deterministic
                    # Pillow encoding instead of raw pixel bytes.
                    from io import BytesIO
                    expected = BytesIO()
                    image.save(expected, "JPEG", optimize=True, quality=94, subsampling=0)
                    if target.read_bytes() != expected.getvalue():
                        issues.append(f"{rel_path}: stale JPEG from a different master")
            print(f"Checked {rel_path}")
    if issues:
        raise SystemExit("Chess Universe branding mismatch:\n" + "\n".join(issues))
    print("All Chess Universe web and iOS assets match the gold knight master.")


if __name__ == "__main__":
    main()
