# -*- coding: utf-8 -*-
"""Fetch latest @the_rosenfeld_ranch posts via Imginn into instagram-posts.json."""
from __future__ import annotations

import json
import re
import html as htmlmod
import urllib.request
from datetime import datetime, timezone
from pathlib import Path

OUT = Path(__file__).resolve().parents[1] / "instagram-posts.json"
USERNAME = "the_rosenfeld_ranch"
URL = f"https://www.imginn.com/{USERNAME}/"
UA = (
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
    "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
)


def fetch(url: str) -> str:
    req = urllib.request.Request(
        url,
        headers={
            "User-Agent": UA,
            "Accept": "text/html,application/xhtml+xml",
            "Accept-Language": "en-US,en;q=0.9",
        },
    )
    with urllib.request.urlopen(req, timeout=25) as r:
        return r.read().decode("utf-8", "replace")


def parse_posts(page: str) -> list[dict]:
    page = htmlmod.unescape(page)
    posts: list[dict] = []
    seen: set[str] = set()

    # Prefer Instagram CDN stills near /p/ shortcodes
    for m in re.finditer(
        r'href="(/p/([A-Za-z0-9_-]+)/?)"[\s\S]{0,1800}?'
        r'(https://scontent[^"\s>]+\.(?:jpg|jpeg|webp)[^"\s>]*)',
        page,
        flags=re.I,
    ):
        shortcode = m.group(2)
        if shortcode in seen:
            continue
        seen.add(shortcode)
        posts.append(
            {
                "id": shortcode,
                "permalink": f"https://www.instagram.com/p/{shortcode}/",
                "image": m.group(3),
                "caption": "",
            }
        )
        if len(posts) >= 12:
            break

    # Fill captions from download aria-labels when present
    captions: dict[str, str] = {}
    for m in re.finditer(
        r'aria-label="download ([^"]{5,400})"[^>]*href="(https://scontent[^"]+)"',
        page,
        flags=re.I,
    ):
        cap = re.sub(r"\s+", " ", m.group(1)).strip()
        # skip junk labels
        if cap.lower().startswith("images or videos"):
            continue
        captions[m.group(2).split("?")[0]] = cap[:280]

    for post in posts:
        key = post["image"].split("?")[0]
        if key in captions:
            post["caption"] = captions[key]

    # Backfill with Imginn CDN thumbs for posts missing CDN stills
    if len(posts) < 12:
        for m in re.finditer(
            r'<a[^>]+href="(/p/([A-Za-z0-9_-]+)/?)"[^>]*>[\s\S]*?'
            r'<img[^>]+src="(https://s\d+\.imginn\.com/[^"]+)"',
            page,
            flags=re.I,
        ):
            shortcode = m.group(2)
            if shortcode in seen:
                continue
            seen.add(shortcode)
            posts.append(
                {
                    "id": shortcode,
                    "permalink": f"https://www.instagram.com/p/{shortcode}/",
                    "image": m.group(3),
                    "caption": "",
                }
            )
            if len(posts) >= 12:
                break
    return posts


def main() -> None:
    html = fetch(URL)
    posts = parse_posts(html)
    payload = {
        "username": USERNAME,
        "profileUrl": f"https://www.instagram.com/{USERNAME}/",
        "source": "imginn",
        "updatedAt": datetime.now(timezone.utc).isoformat().replace("+00:00", "Z"),
        "posts": posts,
    }
    OUT.write_text(json.dumps(payload, indent=2), encoding="utf-8")
    print(f"Wrote {len(posts)} posts to {OUT}")
    for p in posts[:3]:
        print(p["id"], (p["caption"] or "")[:40], p["image"][:70])


if __name__ == "__main__":
    main()
