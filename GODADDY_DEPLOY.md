# GoDaddy upload — rosenfeldranch.com

## What to upload
Use the zip: `dist/rosenfeldranch-godaddy.zip`

Upload contents into the site **document root** (often `public_html` or the domain folder).
Overwrite the “Launching Soon” files. Keep `index.html` at the root.

## Do NOT upload
- `api/`
- `node_modules/`
- `.env` / secrets
- `images/_pretrim/`
- `scripts/`
- `dist/` itself (upload the zip contents)

## DNS
Point `rosenfeldranch.com` (and `www` if used) at this GoDaddy hosting.

## API (Render)
Live API expected at: `https://rosenfeld-ranch-api.onrender.com`

After Render is live, confirm:
`https://rosenfeld-ranch-api.onrender.com/api/health`

## First booking email
FormSubmit may email an “Activate Form” link to `therosenfeldranch@gmail.com` for the new domain Origin — click it once.
