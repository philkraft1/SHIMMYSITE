# GoDaddy upload — rosenfeldranch.com

## Ready-to-upload package
`C:\Users\phsok\OneDrive\Desktop\petting-zoo\dist\rosenfeldranch-godaddy.zip`

1. Log into GoDaddy → your domain **rosenfeldranch.com** → Hosting → File Manager (or cPanel).
2. Open the site document root (`public_html` / domain root).
3. Delete or rename the current “Launching Soon” files.
4. Upload and extract `rosenfeldranch-godaddy.zip` so `index.html` sits at the root.
5. Visit https://rosenfeldranch.com and hard-refresh.

## Do NOT upload
- `api/`
- `node_modules/`
- `.env` / secrets
- `images/_pretrim/`
- `scripts/`

## Live API (already deployed)
- Health: https://rosenfeld-ranch-api.onrender.com/api/health
- Dashboard: https://dashboard.render.com/web/srv-d9k094pt0dsc738m7k8g
- Site JS already points `apiBaseUrl` at this Render URL.

## After swap
- First booking/newsletter may need a FormSubmit “Activate Form” click in `therosenfeldranch@gmail.com` (check spam).
- Free Render apps sleep after idle — first request can take ~30s to wake.
