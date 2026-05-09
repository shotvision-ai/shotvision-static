#!/usr/bin/env python3
"""
Generate Shot Vision assets from assets/images/brand-reference-source.png
(trophy on blue circle). Padding/scaling only for reference-derived outputs.

Companion icons use the blue sampled from the reference + white strokes (same motif).
"""

from __future__ import annotations

import math
import os
from pathlib import Path

from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parents[1]
OUT_DIR = ROOT / "assets/images"


def load_reference() -> Image.Image:
    p = OUT_DIR / "brand-reference-source.png"
    if not p.is_file():
        alt = os.environ.get("SHOTVISION_REFERENCE", "").strip()
        if alt and Path(alt).is_file():
            img = Image.open(alt).convert("RGBA")
            OUT_DIR.mkdir(parents=True, exist_ok=True)
            img.save(p)
            return img
        raise SystemExit(
            f"Missing {p}. Copy your reference PNG there, or set SHOTVISION_REFERENCE=/path/to/ref.png"
        )
    return Image.open(p).convert("RGBA")


def sample_circle_blue(img: Image.Image) -> tuple[int, int, int]:
    img = img.convert("RGBA")
    w, h = img.size
    pixels = img.load()
    blues: list[tuple[int, int, int]] = []
    mid_y = h // 2
    for x in range(w):
        r, g, b, a = pixels[x, mid_y]
        if a < 200:
            continue
        if b > r + 15 and b > g + 15 and b > 100:
            blues.append((r, g, b))
    if blues:
        blues.sort(key=lambda t: sum(t))
        return blues[len(blues) // 2]
    return (43, 101, 236)


def pad_to_square(img: Image.Image) -> Image.Image:
    img = img.convert("RGBA")
    w, h = img.size
    side = max(w, h)
    px = img.load()
    r0, g0, b0, a0 = px[0, 0]
    bg = (r0, g0, b0, a0)
    out = Image.new("RGBA", (side, side), bg)
    ox = (side - w) // 2
    oy = (side - h) // 2
    out.paste(img, (ox, oy), img)
    return out


def resize_sq(img: Image.Image, size: int) -> Image.Image:
    return img.resize((size, size), Image.Resampling.LANCZOS)


def circle_blue_rgb(img_size: int, blue: tuple[int, int, int]) -> Image.Image:
    img = Image.new("RGBA", (img_size, img_size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)
    m = int(img_size * 0.06)
    draw.ellipse([m, m, img_size - m, img_size - m], fill=blue + (255,))
    return img


def stroke_width(img_size: int) -> int:
    return max(4, int(img_size * 0.052))


def companion_overlay(kind: str, img_size: int, blue: tuple[int, int, int]) -> Image.Image:
    """White stroked symbol centered on blue circle (matches reference motif)."""
    base = circle_blue_rgb(img_size, blue)
    draw = ImageDraw.Draw(base)
    cx = cy = img_size // 2
    sw = stroke_width(img_size)
    white = (255, 255, 255, 255)

    r = img_size * 0.22

    def lw():
        return sw

    if kind == "gear":
        n = 6
        od = r * 1.75
        id_ = r * 1.05
        pts = []
        for i in range(n * 2):
            ang = math.pi * i / n - math.pi / 2
            rad = od / 2 if i % 2 == 0 else id_ / 2
            pts.append((cx + math.cos(ang) * rad, cy + math.sin(ang) * rad))
        draw.polygon(pts, outline=white, width=lw())
        ir = r * 0.42
        draw.ellipse([cx - ir, cy - ir, cx + ir, cy + ir], outline=white, width=lw())

    elif kind == "bell":
        w_, h_ = r * 1.35, r * 1.55
        left = cx - w_ / 2
        top = cy - h_ / 2
        draw.arc([left, top, left + w_, top + h_], start=195, end=345, fill=white, width=lw())
        y_base = cy + r * 0.35
        draw.line([(left + r * 0.12, y_base), (left + w_ * 0.18, cy + r * 0.72)], fill=white, width=lw())
        draw.line([(left + w_ - r * 0.12, y_base), (left + w_ - w_ * 0.18, cy + r * 0.72)], fill=white, width=lw())
        draw.line([(left + w_ * 0.12, cy + r * 0.72), (left + w_ * 0.88, cy + r * 0.72)], fill=white, width=lw())
        draw.line([(cx, cy + r * 0.48), (cx, cy + r * 0.78)], fill=white, width=max(2, lw() - 1))

    elif kind == "trash":
        tw = r * 1.2
        top = cy - r * 0.75
        draw.line([(cx - tw * 0.35, top), (cx + tw * 0.35, top)], fill=white, width=lw())
        draw.line([(cx - tw * 0.42, top + r * 0.08), (cx - tw * 0.42, cy + r * 0.85)], fill=white, width=lw())
        draw.line([(cx + tw * 0.42, top + r * 0.08), (cx + tw * 0.42, cy + r * 0.85)], fill=white, width=lw())
        draw.line([(cx - tw * 0.42, cy + r * 0.85), (cx + tw * 0.42, cy + r * 0.85)], fill=white, width=lw())
        draw.line([(cx - tw * 0.22, top), (cx - tw * 0.12, top - r * 0.38)], fill=white, width=lw())
        draw.line([(cx + tw * 0.22, top), (cx + tw * 0.12, top - r * 0.38)], fill=white, width=lw())
        draw.line([(cx - tw * 0.12, top - r * 0.38), (cx + tw * 0.12, top - r * 0.38)], fill=white, width=lw())

    elif kind == "shield":
        pts = [
            (cx, cy - r * 1.1),
            (cx + r * 0.92, cy - r * 0.55),
            (cx + r * 0.92, cy + r * 0.25),
            (cx, cy + r * 1.05),
            (cx - r * 0.92, cy + r * 0.25),
            (cx - r * 0.92, cy - r * 0.55),
        ]
        draw.polygon(pts, outline=white, width=lw())

    elif kind == "player":
        head_r = r * 0.42
        draw.ellipse([cx - head_r, cy - r * 1.05, cx + head_r, cy - r * 0.35], outline=white, width=lw())
        draw.arc([cx - r * 0.95, cy - r * 0.08, cx + r * 0.95, cy + r * 1.12], 25, 155, fill=white, width=lw())

    return base


def main() -> None:
    OUT_DIR.mkdir(parents=True, exist_ok=True)

    ref = load_reference()
    blue = sample_circle_blue(ref)
    print(f"Reference loaded {ref.size}, sampled blue RGB={blue}")

    square = pad_to_square(ref)
    icon_1024 = resize_sq(square, 1024)

    paths_main = [
        "icon.png",
        "adaptive-icon.png",
        "shotvision-app-icon-1024.png",
        "shotvision-splash-icon-1024.png",
    ]
    for name in paths_main:
        icon_1024.save(OUT_DIR / name)

    resize_sq(square, 512).save(OUT_DIR / "shotvision-playstore-icon-512.png")
    resize_sq(square, 48).save(OUT_DIR / "favicon.png")

    # Splash (white bg — matches app.config splash.backgroundColor)
    sw, sh = 1242, 2436
    splash = Image.new("RGB", (sw, sh), (255, 255, 255))
    brand = resize_sq(square, int(min(sw, sh) * 0.38))
    bx = (sw - brand.width) // 2
    by = (sh - brand.height) // 2
    splash.paste(brand, (bx, by), brand)

    splash.save(OUT_DIR / "splash.png")

    # Play feature graphic
    fw, fh = 1024, 500
    graphic = Image.new("RGBA", (fw, fh), blue + (255,))
    brand_f = resize_sq(square, int(fh * 0.78))
    graphic.paste(brand_f, (int(fw * 0.06), (fh - brand_f.height) // 2), brand_f)
    graphic.convert("RGB").save(OUT_DIR / "shotvision-feature-graphic-1024x500.png")

    resize_sq(square, 512).save(OUT_DIR / "shotvision-logo-primary.png")

    lw_, lh_ = 1200, 400
    dark_bg = (17, 24, 39)
    logo_h = Image.new("RGB", (lw_, lh_), dark_bg)
    sm = resize_sq(square, int(lh_ * 0.62))
    logo_h.paste(sm, (int(lw_ * 0.05), (lh_ - sm.height) // 2), sm)
    logo_h.save(OUT_DIR / "shotvision-logo-horizontal-dark.png")

    companions = [
        ("icon-settings.png", "gear"),
        ("icon-notifications.png", "bell"),
        ("icon-delete-account.png", "trash"),
        ("icon-privacy.png", "shield"),
        ("icon-player.png", "player"),
    ]
    for fname, k in companions:
        img512 = companion_overlay(k, 512, blue)
        img512.save(OUT_DIR / fname)
        resize_sq(img512, 256).save(OUT_DIR / fname.replace(".png", "-256.png"))

    print(f"Done. Outputs in {OUT_DIR}")


if __name__ == "__main__":
    main()
