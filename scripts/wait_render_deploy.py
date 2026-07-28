import json
import time
import urllib.error
import urllib.request
from pathlib import Path


def api_key() -> str:
    cfg = Path.home().joinpath(".render/cli.yaml").read_text(encoding="utf-8")
    for line in cfg.splitlines():
        if line.strip().startswith("key:") and "rnd_" in line:
            return line.split("key:", 1)[1].strip()
    raise SystemExit("missing render key")


def get(url: str, key: str):
    req = urllib.request.Request(
        url,
        headers={"Authorization": f"Bearer {key}", "Accept": "application/json"},
    )
    with urllib.request.urlopen(req, timeout=60) as response:
        return json.load(response)


def main() -> None:
    key = api_key()
    svc = "srv-d9k094pt0dsc738m7k8g"
    for i in range(48):
        deploys = get(f"https://api.render.com/v1/services/{svc}/deploys?limit=1", key)
        deploy = deploys[0]["deploy"] if deploys else {}
        status = deploy.get("status")
        print(f"[{i}] deploy={status} id={deploy.get('id')}")
        if status in ("live",):
            break
        if status in ("build_failed", "update_failed", "canceled", "deactivated"):
            print(json.dumps(deploy, indent=2)[:2500])
            raise SystemExit(1)
        time.sleep(10)
    else:
        raise SystemExit("timeout waiting for deploy")

    health = "https://rosenfeld-ranch-api.onrender.com/api/health"
    for i in range(24):
        try:
            with urllib.request.urlopen(health, timeout=45) as response:
                body = response.read().decode()
                print("HEALTH", response.status, body[:500])
                return
        except Exception as exc:  # noqa: BLE001
            print(f"health wait {i}: {exc}")
            time.sleep(10)
    raise SystemExit("health check failed")


if __name__ == "__main__":
    main()
