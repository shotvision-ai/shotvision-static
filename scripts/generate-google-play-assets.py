#!/usr/bin/env python3
"""Build Google Play listing PNGs from master assets in assets/images/. Requires Pillow."""

from __future__ import annotations

import os
from pathlib import Path

from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parents[1]
ASSETS = ROOT / "assets" / "images"
OUT_DIR = ROOT / "assets" / "store" / "google-play"


def center_square_crop(im: Image.Image) -> Image.Image:
    w, h = im.size
    side = min(w, h)
    left = (w - side) // 2
    top = (h - side) // 2
    return im.crop((left, top, left + side, top + side))


def main() -> None:
    OUT_DIR.mkdir(parents=True, exist_ok=True)

    icon_src = Image.open(ASSETS / "app-icon.png").convert("RGBA")
    sq = center_square_crop(icon_src)
    icon_512 = sq.resize((512, 512), Image.Resampling.LANCZOS)
    bg = Image.new("RGBA", (512, 512), (255, 255, 255, 255))
    bg.paste(icon_512, (0, 0), icon_512)
    icon_out = Image.new("RGB", (512, 512), (255, 255, 255))
    icon_out.paste(bg.convert("RGB"))
    icon_path = OUT_DIR / "app-icon-512.png"
    icon_out.save(icon_path, "PNG", optimize=True)
    print(f"Wrote {icon_path} ({icon_out.size[0]}×{icon_out.size[1]})")

    fg_src = Image.open(ASSETS / "feature-graphic.png").convert("RGBA")
    tw, th = 1024, 500
    canvas = Image.new("RGB", (tw, th))
    draw = ImageDraw.Draw(canvas)
    c1, c2 = (0x25, 0x63, 0xEB), (0x12, 0x47, 0xA3)
    for x in range(tw):
        t = x / (tw - 1) if tw > 1 else 0.0
        r = int(c1[0] + (c2[0] - c1[0]) * t)
        g = int(c1[1] + (c2[1] - c1[1]) * t)
        b = int(c1[2] + (c2[2] - c1[2]) * t)
        draw.line([(x, 0), (x, th)], fill=(r, g, b))

    pad_x, pad_y = 48, 40
    inner_w, inner_h = tw - 2 * pad_x, th - 2 * pad_y
    sw, sh = fg_src.size
    scale = min(inner_w / sw, inner_h / sh)
    nw, nh = int(sw * scale), int(sh * scale)
    layer = fg_src.resize((nw, nh), Image.Resampling.LANCZOS)
    px = (tw - nw) // 2
    py = (th - nh) // 2
    overlay = Image.new("RGBA", (tw, th), (0, 0, 0, 0))
    overlay.paste(layer, (px, py), layer)
    final = Image.alpha_composite(canvas.convert("RGBA"), overlay).convert("RGB")
    feat_path = OUT_DIR / "feature-graphic-1024x500.png"
    final.save(feat_path, "PNG", optimize=True)
    print(f"Wrote {feat_path} ({final.size[0]}×{final.size[1]})")


if __name__ == "__main__":
    main()
