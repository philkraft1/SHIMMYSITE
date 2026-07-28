"""Generate showcase.html gallery markup from manifest.json."""
from __future__ import annotations

import json
from pathlib import Path

ROOT = Path(r"C:\Users\phsok\OneDrive\Desktop\petting-zoo")
manifest = json.loads((ROOT / "_tmp_unique" / "manifest.json").read_text(encoding="utf-8"))

cat_labels = {
    "featured": "Featured",
    "cows": "Cows",
    "goats": "Goats",
    "ponies": "Ponies &amp; Donkeys",
    "dogs": "Dogs",
    "birds": "Birds",
    "farm": "Farm &amp; Landscape",
}

figures = []
for item in manifest:
    cats = " ".join(item["cats"])
    primary = next((c for c in item["cats"] if c != "featured"), item["cats"][0])
    label = cat_labels[primary]
    feat = " showcase-item--featured" if item["feat"] else ""
    alt = item["alt"].replace('"', "&quot;")
    figures.append(
        f"""          <figure class="showcase-item{feat}" data-cats="{cats}">
            <button type="button" class="showcase-thumb" data-src="images/showcase/{item['file']}" data-alt="{alt}">
              <img src="images/showcase/{item['file']}" alt="{alt}" loading="lazy" width="{item['w']}" height="{item['h']}" />
            </button>
            <figcaption><span class="showcase-cat">{label}</span></figcaption>
          </figure>"""
    )

gallery_html = "\n".join(figures)

html = f"""<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Showcase — Rosenfeld Ranch</title>
    <meta
      name="description"
      content="Photos from Rosenfeld Ranch — Highland calves, goats, ponies, dogs, birds, and golden-hour farm landscapes."
    />
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
    <link
      href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;500;600;700&family=Source+Sans+3:wght@400;500;600;700&display=swap"
      rel="stylesheet"
    />
    <link rel="stylesheet" href="styles.css" />
  </head>
  <body>
    <header class="site-header">
      <div class="wrap header-inner">
        <a class="logo" href="index.html">
          <img class="logo-mark" src="images/logo-r.png" alt="" width="44" height="44" />
          <span class="logo-text">
            Rosenfeld Ranch
            <span>Est. 2024 · Howell, NJ</span>
          </span>
        </a>
        <button class="nav-toggle" type="button" aria-label="Open menu" aria-expanded="false">☰</button>
        <nav class="nav" aria-label="Main">
          <a href="index.html">Home</a>
          <a href="ranch.html">The Ranch</a>
          <a href="village.html">The Village</a>
          <a href="events.html">Events</a>
          <div class="nav-dropdown">
            <button class="nav-dropdown-toggle" type="button" aria-expanded="false" aria-haspopup="true">
              More
            </button>
            <div class="nav-dropdown-menu" role="menu">
              <a href="bookings.html" role="menuitem">Bookings</a>
              <a href="showcase.html" role="menuitem" aria-current="page">Showcase</a>
              <a href="reviews.html" role="menuitem">Reviews</a>
              <a href="testimonials.html" role="menuitem">Testimonials</a>
              <a href="membership.html" role="menuitem">Membership</a>
              <a href="instagram.html" role="menuitem">Instagram</a>
              <a href="blog.html" role="menuitem">Blog</a>
            </div>
          </div>
          <a href="contact.html">Contact</a>
          <span class="nav-cta">
            <a class="btn btn-primary" href="ranch.html#admission">Pay online</a>
          </span>
        </nav>
      </div>
    </header>

    <main>
      <section class="page-hero">
        <div class="wrap">
          <p class="eyebrow">Photos &amp; videos</p>
          <h1>Showcase</h1>
          <p class="lead">
            A look at life on the ranch — Highland calves, blue-eyed kids,
            fluffy donkeys, and evenings under the string lights.
          </p>
        </div>
      </section>

      <section class="section section--tight showcase-section" aria-label="Photo gallery">
        <div class="wrap">
          <div class="showcase-filters" role="toolbar" aria-label="Filter photos by category">
            <button type="button" class="showcase-filter is-active" data-filter="all" aria-pressed="true">All</button>
            <button type="button" class="showcase-filter" data-filter="featured" aria-pressed="false">Featured</button>
            <button type="button" class="showcase-filter" data-filter="cows" aria-pressed="false">Cows</button>
            <button type="button" class="showcase-filter" data-filter="goats" aria-pressed="false">Goats</button>
            <button type="button" class="showcase-filter" data-filter="ponies" aria-pressed="false">Ponies &amp; Donkeys</button>
            <button type="button" class="showcase-filter" data-filter="dogs" aria-pressed="false">Dogs</button>
            <button type="button" class="showcase-filter" data-filter="birds" aria-pressed="false">Birds</button>
            <button type="button" class="showcase-filter" data-filter="farm" aria-pressed="false">Farm &amp; Landscape</button>
          </div>

          <div class="showcase-grid" id="showcase-grid">
{gallery_html}
          </div>

          <p class="showcase-empty" id="showcase-empty" hidden>No photos in this category yet.</p>
        </div>
      </section>
    </main>

    <div class="showcase-lightbox" id="showcase-lightbox" hidden>
      <button type="button" class="showcase-lightbox-close" aria-label="Close photo">×</button>
      <button type="button" class="showcase-lightbox-nav showcase-lightbox-prev" aria-label="Previous photo">‹</button>
      <img src="" alt="" />
      <button type="button" class="showcase-lightbox-nav showcase-lightbox-next" aria-label="Next photo">›</button>
    </div>

    <footer class="site-footer">
      <div class="wrap">
        <div class="footer-grid">
          <div>
            <a class="logo" href="index.html">
              <img class="logo-mark" src="images/logo-r.png" alt="" width="44" height="44" />
              <span class="logo-text">
                Rosenfeld Ranch
                <span>Est. 2024</span>
              </span>
            </a>
          </div>
          <div>
            <h4>Explore</h4>
            <ul>
              <li><a href="ranch.html">The Ranch</a></li>
              <li><a href="village.html">The Village</a></li>
              <li><a href="events.html">Events</a></li>
              <li><a href="bookings.html">Bookings</a></li>
              <li><a href="showcase.html">Showcase</a></li>
              <li><a href="reviews.html">Reviews</a></li>
              <li><a href="testimonials.html">Testimonials</a></li>
              <li><a href="membership.html">Membership</a></li>
              <li><a href="instagram.html">Instagram</a></li>
              <li><a href="blog.html">Blog</a></li>
              <li><a href="contact.html">Contact</a></li>
            </ul>
          </div>
          <div>
            <h4>Find us</h4>
            <ul>
              <li>Ranch: 184 Kent Rd, Howell, NJ 07731</li>
              <li>The Village: 1368 River Ave, Lakewood, NJ</li>
              <li><a href="tel:9293262188">(929) 326-2188</a></li>
            </ul>
          </div>
        </div>
        <div class="footer-bottom">
          <span>© <span id="year"></span> Rosenfeld Ranch</span>
          <span>Online checkout powered by Square</span>
        </div>
      </div>
    </footer>

    <script src="nav.js"></script>
    <script src="showcase.js"></script>
    <script>
      document.getElementById("year").textContent = new Date().getFullYear();
    </script>
  </body>
</html>
"""

(ROOT / "showcase.html").write_text(html, encoding="utf-8")
print(f"Wrote showcase.html with {len(figures)} figures")
