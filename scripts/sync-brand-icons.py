#!/usr/bin/env python3
"""Generate website/favicon + Expo icon files from one existing Chess Universe icon.

The high-resolution 512px knight icon already used in the site's PWA manifest
is the canonical master for its 64px favicon and native iOS icon. Never replace
the emblem with a newly invented logo or upscale the 64px favicon itself.

Usage:
  python scripts/sync-brand-icons.py --write
  python scripts/sync-brand-icons.py --check
"""
import argparse
from pathlib import Path

from PIL import Image, ImageChops, ImageStat

ROOT = Path(__file__).resolve().parent.parent
MASTER = ROOT / "public/brand/knight-icon-512.png"
LIME = (215, 255, 74)  # Original knight/favicon SVG #d7ff4a.
TARGETS = {
    "public/brand/favicon-64.png": 64,
    "public/brand/knight-icon-192.png": 192,
    "public/brand/apple-touch-icon.png": 180,
    "apps/mobile/assets/logo-mark.png": 256,
    "apps/mobile/assets/icon.png": 1024,
}


def canonical_master():
    with Image.open(MASTER) as src:
        if src.size != (512, 512):
            raise ValueError(f"Expected 512×512 source: {src.size}")
        rgba = src.convert("RGBA")
        # App Store icons cannot have an alpha channel. Keep the original lime.
        background = Image.new("RGBA", rgba.size, LIME + (255,))
        background.alpha_composite(rgba)
        return background.convert("RGB")


def expected(icon, size):
    return icon.resize((size, size), Image.Resampling.LANCZOS)


def main():
    parser = argparse.ArgumentParser()
    group = parser.add_mutually_exclusive_group(required=True)
    group.add_argument("--write", action="store_true")
    group.add_argument("--check", action="store_true")
    opts = parser.parse_args()
    master = canonical_master()
    # Protect the user's existing favicon from being replaced by a different logo.
    # Minor anti-aliasing differences between 64px and 512px exports are expected.
    current_favicon = ROOT / "public/brand/favicon-64.png"
    if opts.write and current_favicon.exists():
        with Image.open(current_favicon) as old:
            old_rgba = old.convert("RGBA")
            canvas = Image.new("RGBA", old_rgba.size, LIME + (255,))
            canvas.alpha_composite(old_rgba)
            prior = canvas.convert("RGB")
        if prior.size != (64, 64):
            raise SystemExit("Existing favicon has unexpected dimensions")
        difference = ImageChops.difference(prior, expected(master, 64))
        mean_difference = sum(ImageStat.Stat(difference).mean) / 3.0
        print(f"Original favicon vs high-resolution knight: mean RGB diff {mean_difference:.1f}")
        if mean_difference > 45.0:
            raise SystemExit("Existing favicon differs materially from the 512px icon; do not overwrite it")
    mismatches = []
    for dest, size in TARGETS.items():
        path = ROOT / dest
        out = expected(master, size)
        if opts.write:
            path.parent.mkdir(parents=True, exist_ok=True)
            out.save(path, "PNG", optimize=True)
            print(f"Synced {dest} ({size}×{size}, opaque RGB)")
        else:
            if not path.exists():
                mismatches.append(dest + " (missing)")
                continue
            with Image.open(path) as actual:
                if actual.size != (size, size) or actual.mode not in ("RGB", "P"):
                    mismatches.append(dest + " (wrong dimensions or nonopaque icon)")
                elif actual.convert("RGB").tobytes() != out.tobytes():
                    mismatches.append(dest + " (not sourced from canonical favicon)")
            print(f"Checked {dest}")
    if mismatches:
        raise SystemExit("Brand asset drift: " + ", ".join(mismatches))
    print("Chess Universe web and native icons match the same source.")


if __name__ == "__main__":
    main()
