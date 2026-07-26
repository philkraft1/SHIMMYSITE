"""Trim outer cream/white margins; make logo whites transparent."""
from __future__ import annotations

import os
import tempfile
import time
from collections import deque
from pathlib import Path

from PIL import Image

img_dir = Path(__file__).resolve().parents[1] / "images"
backup = img_dir / "_pretrim"

FLYERS = [
    "open-year-round.png",
    "eggs-flyer.png",
    "eggs-coming-soon.png",
    "photography-venue.png",
    "village-flyer.png",
    "village-banner.png",
]

LOGOS = [
    "logo-badge.png",
    "logo-r.png",
    "logo-wordmark.png",
]


def safe_save(im: Image.Image, path: Path, **kwargs) -> None:
    path = Path(path)
    fd, tmp = tempfile.mkstemp(suffix=path.suffix, dir=str(path.parent))
    os.close(fd)
    tmp_path = Path(tmp)
    try:
        im.save(tmp_path, optimize=True, **kwargs)
        last = None
        for attempt in range(12):
            try:
                os.replace(tmp_path, path)
                return
            except OSError as e:
                last = e
                time.sleep(0.4 * (attempt + 1))
        raise last  # type: ignore[misc]
    finally:
        if tmp_path.exists():
            try:
                tmp_path.unlink()
            except OSError:
                pass


def source_path(name: str) -> Path:
    bak = backup / name
    return bak if bak.exists() else img_dir / name


def is_margin_color(r: int, g: int, b: int, a: int) -> bool:
    if a < 12:
        return True
    if r >= 245 and g >= 245 and b >= 245:
        return True
    # Cream / warm paper mats
    if min(r, g, b) >= 185 and (r + g + b) / 3 >= 205:
        return True
    if min(r, g, b) >= 175 and (r + g + b) / 3 >= 198 and abs(r - g) < 40 and abs(g - b) < 45:
        return True
    # Cool light gray mats
    if min(r, g, b) >= 220 and max(r, g, b) - min(r, g, b) < 18:
        return True
    return False


def is_dark_frame(r: int, g: int, b: int, a: int) -> bool:
    if a < 200:
        return False
    s = r + g + b
    return s < 430 and r < 205 and g < 185


def detect_dark_frame(im: Image.Image):
    """Find outer dark rectangular frame (e.g. ranch flyer border)."""
    im = im.convert("RGBA")
    w, h = im.size
    px = im.load()

    border_rows = []
    for y in range(h):
        dark = 0
        for x in range(w):
            if is_dark_frame(*px[x, y]):
                dark += 1
        if dark >= int(w * 0.45):
            border_rows.append(y)

    border_cols = []
    for x in range(w):
        dark = 0
        for y in range(h):
            if is_dark_frame(*px[x, y]):
                dark += 1
        if dark >= int(h * 0.45):
            border_cols.append(x)

    if len(border_rows) < 2 or len(border_cols) < 2:
        return None

    top, bot = border_rows[0], border_rows[-1]
    left, right = border_cols[0], border_cols[-1]
    fw, fh = right - left + 1, bot - top + 1

    # Must look like a full-bleed frame, not random dark content
    if fw < w * 0.55 or fh < h * 0.55:
        return None
    if left > w * 0.2 or top > h * 0.2:
        return None
    if (w - 1 - right) > w * 0.2 or (h - 1 - bot) > h * 0.2:
        return None

    # Require a real light mat outside the frame (avoids matching dark-green flyers)
    mat_samples = 0
    mat_hits = 0
    for y in range(0, max(1, top)):
        for x in range(0, w, max(1, w // 40)):
            mat_samples += 1
            if is_margin_color(*px[x, y]):
                mat_hits += 1
    for y in range(min(h, bot + 1), h):
        for x in range(0, w, max(1, w // 40)):
            mat_samples += 1
            if is_margin_color(*px[x, y]):
                mat_hits += 1
    for x in range(0, max(1, left)):
        for y in range(0, h, max(1, h // 40)):
            mat_samples += 1
            if is_margin_color(*px[x, y]):
                mat_hits += 1
    for x in range(min(w, right + 1), w):
        for y in range(0, h, max(1, h // 40)):
            mat_samples += 1
            if is_margin_color(*px[x, y]):
                mat_hits += 1
    if mat_samples < 20 or mat_hits / mat_samples < 0.55:
        return None

    return (left, top, right + 1, bot + 1)


def flood_margin_mask(im: Image.Image) -> list[list[bool]]:
    im = im.convert("RGBA")
    w, h = im.size
    px = im.load()
    mask = [[False] * w for _ in range(h)]
    q: deque[tuple[int, int]] = deque()

    seeds = [(0, 0), (w - 1, 0), (0, h - 1), (w - 1, h - 1)]
    step_x = max(1, w // 24)
    step_y = max(1, h // 24)
    for x in range(0, w, step_x):
        seeds.append((x, 0))
        seeds.append((x, h - 1))
    for y in range(0, h, step_y):
        seeds.append((0, y))
        seeds.append((w - 1, y))

    for x, y in seeds:
        if is_margin_color(*px[x, y]) and not mask[y][x]:
            mask[y][x] = True
            q.append((x, y))

    while q:
        x, y = q.popleft()
        for nx, ny in ((x - 1, y), (x + 1, y), (x, y - 1), (x, y + 1)):
            if nx < 0 or ny < 0 or nx >= w or ny >= h or mask[ny][nx]:
                continue
            if is_margin_color(*px[nx, ny]):
                mask[ny][nx] = True
                q.append((nx, ny))
    return mask


def largest_content_bbox(mask: list[list[bool]], w: int, h: int, pad: int = 0):
    visited = [[False] * w for _ in range(h)]
    best = None
    best_area = 0

    for y in range(h):
        for x in range(w):
            if mask[y][x] or visited[y][x]:
                continue
            q: deque[tuple[int, int]] = deque([(x, y)])
            visited[y][x] = True
            minx = maxx = x
            miny = maxy = y
            area = 0
            while q:
                cx, cy = q.popleft()
                area += 1
                minx = min(minx, cx)
                maxx = max(maxx, cx)
                miny = min(miny, cy)
                maxy = max(maxy, cy)
                for nx, ny in ((cx - 1, cy), (cx + 1, cy), (cx, cy - 1), (cx, cy + 1)):
                    if nx < 0 or ny < 0 or nx >= w or ny >= h:
                        continue
                    if visited[ny][nx] or mask[ny][nx]:
                        continue
                    visited[ny][nx] = True
                    q.append((nx, ny))
            if area > best_area:
                best_area = area
                best = (minx, miny, maxx, maxy)

    if best is None:
        return (0, 0, w, h)
    minx, miny, maxx, maxy = best
    return (
        max(0, minx - pad),
        max(0, miny - pad),
        min(w, maxx + 1 + pad),
        min(h, maxy + 1 + pad),
    )


def trim_mostly_margin_edges(im: Image.Image, box, ratio: float = 0.78):
    """Shrink box while edge rows/cols are mostly cream/white."""
    im = im.convert("RGBA")
    w, h = im.size
    px = im.load()
    left, top, right, bot = box

    def row_ratio(y, x0, x1):
        if y < 0 or y >= h or x1 <= x0:
            return 0.0
        m = sum(1 for x in range(x0, x1) if is_margin_color(*px[x, y]))
        return m / (x1 - x0)

    def col_ratio(x, y0, y1):
        if x < 0 or x >= w or y1 <= y0:
            return 0.0
        m = sum(1 for y in range(y0, y1) if is_margin_color(*px[x, y]))
        return m / (y1 - y0)

    changed = True
    while changed and right - left > 40 and bot - top > 40:
        changed = False
        if row_ratio(top, left, right) >= ratio:
            top += 1
            changed = True
        if row_ratio(bot - 1, left, right) >= ratio:
            bot -= 1
            changed = True
        if col_ratio(left, top, bot) >= ratio:
            left += 1
            changed = True
        if col_ratio(right - 1, top, bot) >= ratio:
            right -= 1
            changed = True
    return (left, top, right, bot)


def trim_flyer(im: Image.Image) -> tuple[Image.Image, tuple, str]:
    im = im.convert("RGBA")
    w, h = im.size

    frame = detect_dark_frame(im)
    if frame is not None:
        return im.crop(frame), frame, "frame"

    mask = flood_margin_mask(im)
    box = largest_content_bbox(mask, w, h, pad=0)
    box = trim_mostly_margin_edges(im, box, ratio=0.72)
    return im.crop(box), box, "flood"


def knockout_background_white(im: Image.Image, threshold: int = 235) -> Image.Image:
    """Make only background whites transparent (flood from edges). Keeps white ink inside logos."""
    im = im.convert("RGBA")
    w, h = im.size
    px = im.load()

    def is_bg(r: int, g: int, b: int, a: int) -> bool:
        return a < 12 or (r >= threshold and g >= threshold and b >= threshold)

    mask = [[False] * w for _ in range(h)]
    q: deque[tuple[int, int]] = deque()
    seeds = [(0, 0), (w - 1, 0), (0, h - 1), (w - 1, h - 1)]
    for x in range(0, w, max(1, w // 20)):
        seeds.append((x, 0))
        seeds.append((x, h - 1))
    for y in range(0, h, max(1, h // 20)):
        seeds.append((0, y))
        seeds.append((w - 1, y))
    for x, y in seeds:
        if is_bg(*px[x, y]) and not mask[y][x]:
            mask[y][x] = True
            q.append((x, y))
    while q:
        x, y = q.popleft()
        for nx, ny in ((x - 1, y), (x + 1, y), (x, y - 1), (x, y + 1)):
            if nx < 0 or ny < 0 or nx >= w or ny >= h or mask[ny][nx]:
                continue
            if is_bg(*px[nx, ny]):
                mask[ny][nx] = True
                q.append((nx, ny))

    out = im.copy()
    opx = out.load()
    for y in range(h):
        for x in range(w):
            if mask[y][x]:
                r, g, b, _a = opx[x, y]
                opx[x, y] = (r, g, b, 0)
    return out


def content_bbox_alpha(im: Image.Image, pad: int = 2):
    im = im.convert("RGBA")
    w, h = im.size
    px = im.load()
    minx, miny, maxx, maxy = w, h, -1, -1
    for y in range(h):
        for x in range(w):
            if px[x, y][3] > 20:
                minx = min(minx, x)
                miny = min(miny, y)
                maxx = max(maxx, x)
                maxy = max(maxy, y)
    if maxx < 0:
        return im, (0, 0, w, h)
    box = (
        max(0, minx - pad),
        max(0, miny - pad),
        min(w, maxx + 1 + pad),
        min(h, maxy + 1 + pad),
    )
    return im.crop(box), box


def main() -> None:
    results: list[str] = []
    out_dir = img_dir / "_trimmed"
    out_dir.mkdir(exist_ok=True)

    for name in FLYERS:
        src = source_path(name)
        if not src.exists():
            results.append(f"MISSING {name}")
            continue
        im = Image.open(src)
        cropped, box, method = trim_flyer(im)
        safe_save(cropped, out_dir / name)
        results.append(
            f"FLYER {name}: {im.size[0]}x{im.size[1]} -> {cropped.size[0]}x{cropped.size[1]} "
            f"box={box} via {method}"
        )

    for name in LOGOS:
        src = source_path(name)
        if not src.exists():
            results.append(f"MISSING {name}")
            continue
        im = Image.open(src)
        transparent = knockout_background_white(im, threshold=235)
        cropped, box = content_bbox_alpha(transparent, pad=4)
        safe_save(cropped, out_dir / name)
        results.append(
            f"LOGO  {name}: {im.size[0]}x{im.size[1]} -> {cropped.size[0]}x{cropped.size[1]} box={box}"
        )

    for name in FLYERS + LOGOS:
        src = out_dir / name
        if not src.exists():
            continue
        dest = img_dir / name
        ok = False
        last = None
        for _ in range(12):
            try:
                os.replace(src, dest)
                ok = True
                break
            except OSError as e:
                last = e
                time.sleep(0.5)
        results.append(f"PROMOTE {name}: {'ok' if ok else f'FAILED ({last})'}")

    print("\n".join(results))


if __name__ == "__main__":
    main()
