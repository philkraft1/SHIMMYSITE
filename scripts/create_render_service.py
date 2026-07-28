import json
import urllib.error
import urllib.request
from pathlib import Path

ROOT = Path(r"C:\Users\phsok\OneDrive\Desktop\petting-zoo")


def load_env(path: Path) -> dict:
    env = {}
    for line in path.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, value = line.split("=", 1)
        env[key] = value
    return env


def render_api_key() -> str:
    cfg = Path.home().joinpath(".render/cli.yaml").read_text(encoding="utf-8")
    for line in cfg.splitlines():
        if line.strip().startswith("key:") and "rnd_" in line:
            return line.split("key:", 1)[1].strip()
    raise SystemExit("Render API key not found. Run render login.")


def main() -> None:
    key = render_api_key()
    env = load_env(ROOT / "api" / ".env")
    owner = "tea-d9j6ci37uimc73cipctg"
    payload = {
        "type": "web_service",
        "name": "rosenfeld-ranch-api",
        "ownerId": owner,
        "repo": "https://github.com/philkraft1/SHIMMYSITE",
        "autoDeploy": "yes",
        "branch": "main",
        "rootDir": "api",
        "serviceDetails": {
            "runtime": "node",
            "plan": "free",
            "region": "oregon",
            "healthCheckPath": "/api/health",
            "envSpecificDetails": {
                "buildCommand": "npm install",
                "startCommand": "npm start",
            },
        },
        "envVars": [
            {"key": "NODE_VERSION", "value": "22"},
            {"key": "SQUARE_ACCESS_TOKEN", "value": env["SQUARE_ACCESS_TOKEN"]},
            {"key": "SQUARE_LOCATION_ID", "value": env["SQUARE_LOCATION_ID"]},
            {"key": "SQUARE_ENVIRONMENT", "value": "production"},
            {
                "key": "NEWSLETTER_INBOX",
                "value": env.get("NEWSLETTER_INBOX", "therosenfeldranch@gmail.com"),
            },
            {"key": "ADMIN_KEY", "value": env["ADMIN_KEY"]},
            {"key": "DATABASE_URL", "value": env["DATABASE_URL"]},
            {"key": "SITE_PUBLIC_URL", "value": "https://rosenfeldranch.com"},
            {"key": "CHECKOUT_REDIRECT_URL", "value": "https://rosenfeldranch.com/"},
        ],
    }
    data = json.dumps(payload).encode()
    req = urllib.request.Request(
        "https://api.render.com/v1/services",
        data=data,
        method="POST",
        headers={
            "Authorization": f"Bearer {key}",
            "Accept": "application/json",
            "Content-Type": "application/json",
        },
    )
    try:
        with urllib.request.urlopen(req, timeout=120) as response:
            body = json.load(response)
    except urllib.error.HTTPError as exc:
        print("HTTP", exc.code)
        print(exc.read().decode()[:4000])
        raise SystemExit(1) from exc

    service = body.get("service", body)
    details = service.get("serviceDetails") or {}
    url = details.get("url") or "https://rosenfeld-ranch-api.onrender.com"
    (ROOT / "api" / "RENDER_URL.txt").write_text(url.rstrip("/") + "\n", encoding="utf-8")
    print(
        json.dumps(
            {
                "id": service.get("id"),
                "name": service.get("name"),
                "url": url,
                "dashboard": f"https://dashboard.render.com/web/{service.get('id')}",
            },
            indent=2,
        )
    )


if __name__ == "__main__":
    main()
