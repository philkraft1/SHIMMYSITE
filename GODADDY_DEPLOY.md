# Live launch — rosenfeldranch.com

## Status
- Site files deployed to GitHub Pages branch `gh-pages`
- Custom domain set to `rosenfeldranch.com` in GitHub Pages
- API live at `https://rosenfeld-ranch-api.onrender.com`
- GoDaddy currently still points DNS at Website Builder (“Launching Soon”)

## Finish the swap (DNS at GoDaddy) — required
Sign in at GoDaddy → Domain **rosenfeldranch.com** → **DNS**:

1. Remove Website Builder / forwarding A records (`13.248.243.5`, `76.223.105.230`) if present.
2. Add these **A** records for `@` (root):

```
185.199.108.153
185.199.109.153
185.199.110.153
185.199.111.153
```

3. Set **www** CNAME to:

```
philkraft1.github.io
```

4. Save. Wait 5–30 minutes for DNS.
5. In GitHub → repo Settings → Pages → enable **Enforce HTTPS** once available.

## Temporary preview (while DNS updates)
After Pages finishes building: https://philkraft1.github.io/SHIMMYSITE/

## Upload zip (only if you switch to cPanel file hosting later)
`dist/rosenfeldranch-godaddy.zip`
