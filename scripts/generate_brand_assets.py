"""
Generates the Level Up app icon (1024x1024) and splash screen (2732x2732).

Design: matches the app's actual in-app theme —
  background: near-black (#0a0a0f)
  primary accent: purple (#8b5cf6 / #a855f7)
  secondary accent: amber (#f59e0b) — used for XP/tier badges in-app

Mark: three upward-stacked chevrons (a level/rank insignia, echoing the
app's tier badge concept) with an amber-to-purple gradient, sitting in a
soft radial glow.
"""

import math
import numpy as np
from PIL import Image, ImageDraw, ImageFilter, ImageFont

# ---------------------------------------------------------------
# Colors (matching src/app/globals.css and the Tailwind accents used
# throughout the app)
# ---------------------------------------------------------------
BG_TOP = (10, 8, 18)        # near-black, faint purple tint
BG_BOTTOM = (24, 14, 36)    # deep purple-black
GLOW = (139, 92, 246)       # purple-500
AMBER = (245, 158, 11)      # amber-500
PURPLE = (168, 85, 247)     # purple-500 (brighter, used for gradient end)
WHITE = (255, 255, 255)


def radial_gradient(size, inner, outer, center=None, radius_scale=0.75):
    w, h = size
    if center is None:
        center = (w / 2, h / 2)
    y, x = np.ogrid[:h, :w]
    dist = np.sqrt((x - center[0]) ** 2 + (y - center[1]) ** 2)
    max_dist = radius_scale * math.hypot(w, h) / 2
    t = np.clip(dist / max_dist, 0, 1)
    img = np.zeros((h, w, 3), dtype=np.uint8)
    for c in range(3):
        img[..., c] = (inner[c] * (1 - t) + outer[c] * t).astype(np.uint8)
    return Image.fromarray(img, "RGB")


def vertical_gradient(size, top, bottom):
    w, h = size
    grad = np.zeros((h, w, 3), dtype=np.uint8)
    for y in range(h):
        t = y / (h - 1)
        for c in range(3):
            grad[y, :, c] = int(top[c] * (1 - t) + bottom[c] * t)
    return Image.fromarray(grad, "RGB")


def lerp_color(c1, c2, t):
    return tuple(int(c1[i] * (1 - t) + c2[i] * t) for i in range(3))


def draw_chevron(draw, cx, cy, width, thickness, color, angle_deg=45):
    """A single upward chevron ( ^ shape ) made of two thick angled bars."""
    half_w = width / 2
    rise = width * math.tan(math.radians(angle_deg)) / 2
    # Points: left-bottom -> apex -> right-bottom, drawn as a thick polyline
    apex = (cx, cy - rise)
    left = (cx - half_w, cy + rise * 0.15)
    right = (cx + half_w, cy + rise * 0.15)
    draw.line([left, apex, right], fill=color, width=int(thickness), joint="curve")
    # Rounded caps
    r = thickness / 2
    for pt in (left, apex, right):
        draw.ellipse([pt[0] - r, pt[1] - r, pt[0] + r, pt[1] + r], fill=color)


def build_mark(size, scale=1.0):
    """Returns an RGBA image containing just the chevron mark, transparent bg."""
    mark = Image.new("RGBA", size, (0, 0, 0, 0))
    draw = ImageDraw.Draw(mark)
    cx = size[0] / 2
    width = size[0] * 0.5 * scale
    thickness = size[0] * 0.075 * scale
    gap = size[1] * 0.16 * scale
    base_y = size[1] * 0.62

    # Three stacked chevrons, amber at bottom fading to purple at top
    positions_and_colors = [
        (base_y, AMBER),
        (base_y - gap, lerp_color(AMBER, PURPLE, 0.5)),
        (base_y - gap * 2, PURPLE),
    ]
    for cy, color in positions_and_colors:
        draw_chevron(draw, cx, cy, width, thickness, color)

    return mark


def make_icon(path, size=1024):
    bg = radial_gradient((size, size), GLOW, BG_TOP, radius_scale=0.55)
    vg = vertical_gradient((size, size), (0, 0, 0), BG_BOTTOM)
    bg = Image.blend(bg, vg, 0.35)

    # Soft glow blob behind the mark
    glow_layer = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    gd = ImageDraw.Draw(glow_layer)
    r = size * 0.30
    cx = cy = size / 2
    gd.ellipse([cx - r, cy - r, cx + r, cy + r], fill=(168, 85, 247, 130))
    glow_layer = glow_layer.filter(ImageFilter.GaussianBlur(size * 0.06))
    bg = Image.alpha_composite(bg.convert("RGBA"), glow_layer)

    mark = build_mark((size, size), scale=1.0)
    # subtle drop shadow for the mark
    shadow = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    shadow_mark = build_mark((size, size), scale=1.0)
    shadow_alpha = shadow_mark.split()[3].point(lambda a: int(a * 0.6))
    shadow_solid = Image.new("RGBA", (size, size), (0, 0, 0, 255))
    shadow.paste(shadow_solid, (0, 0), shadow_alpha)
    shadow = shadow.filter(ImageFilter.GaussianBlur(size * 0.02))
    offset = int(size * 0.012)
    bg.alpha_composite(shadow, (0, offset))

    bg.alpha_composite(mark)

    icon = bg.convert("RGB")  # iOS requires no alpha channel
    icon.save(path, "PNG")
    print(f"Saved icon -> {path} ({icon.size[0]}x{icon.size[1]})")


def make_splash(path, size=2732):
    bg = Image.new("RGB", (size, size), BG_TOP)
    vg = vertical_gradient((size, size), BG_TOP, BG_BOTTOM)
    bg = Image.blend(bg, vg, 0.6)

    glow_layer = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    gd = ImageDraw.Draw(glow_layer)
    r = size * 0.22
    cx, cy = size / 2, size * 0.46
    gd.ellipse([cx - r, cy - r, cx + r, cy + r], fill=(139, 92, 246, 90))
    glow_layer = glow_layer.filter(ImageFilter.GaussianBlur(size * 0.05))
    bg = Image.alpha_composite(bg.convert("RGBA"), glow_layer)

    mark = build_mark((size, size), scale=0.55)
    # Recenter mark vertically a bit higher to leave room for wordmark
    mark_shifted = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    mark_shifted.alpha_composite(mark, (0, int(-size * 0.06)))
    bg.alpha_composite(mark_shifted)

    draw = ImageDraw.Draw(bg)
    text = "LEVEL UP"
    font_size = int(size * 0.055)
    font = None
    for fp in (
        "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf",
        "/usr/share/fonts/truetype/liberation/LiberationSans-Bold.ttf",
    ):
        try:
            font = ImageFont.truetype(fp, font_size)
            break
        except Exception:
            continue
    if font is None:
        font = ImageFont.load_default()

    bbox = draw.textbbox((0, 0), text, font=font)
    tw = bbox[2] - bbox[0]
    th = bbox[3] - bbox[1]
    tx = (size - tw) / 2
    ty = size * 0.62
    # Letter-spacing (manual, since PIL has no native tracking support)
    spacing = int(font_size * 0.12)
    total_w = tw + spacing * (len(text) - 1)
    x = (size - total_w) / 2
    for ch in text:
        draw.text((x, ty), ch, font=font, fill=(255, 255, 255, 255))
        cb = draw.textbbox((0, 0), ch, font=font)
        x += (cb[2] - cb[0]) + spacing

    splash = bg.convert("RGB")
    splash.save(path, "PNG")
    print(f"Saved splash -> {path} ({splash.size[0]}x{splash.size[1]})")


if __name__ == "__main__":
    import os
    os.makedirs("assets", exist_ok=True)
    make_icon("assets/icon.png")
    make_splash("assets/splash.png")
