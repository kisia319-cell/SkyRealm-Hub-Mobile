"""Load optional server/.env settings and run the local SkyRealm API."""
from __future__ import annotations
import os
from pathlib import Path

ROOT = Path(__file__).resolve().parent
ENV_FILE = ROOT / ".env"


def load_env_file(path: Path) -> None:
    if not path.exists():
        return
    for raw_line in path.read_text(encoding="utf-8-sig").splitlines():
        line = raw_line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, value = line.split("=", 1)
        key = key.strip()
        value = value.strip()
        if len(value) >= 2 and value[0] == value[-1] and value[0] in ("'", '"'):
            value = value[1:-1]
        if key and key.replace("_", "").isalnum():
            # Existing process environment takes precedence over the .env file.
            os.environ.setdefault(key, value)


load_env_file(ENV_FILE)
os.environ.setdefault("DATABASE_URL", "sqlite:///./skyrealm_auth.db")

smtp_fields = ("SMTP_HOST", "SMTP_USER", "SMTP_PASSWORD", "SMTP_FROM")
smtp_configured = all(os.getenv(field, "").strip() for field in smtp_fields)
# Local fallback: print confirmation codes only when SMTP isn't configured.
# As soon as SMTP fields are provided, email sending is enabled by default.
os.environ.setdefault("DEV_PRINT_EMAIL_CODE", "false" if smtp_configured else "true")
# Google displays App Passwords in groups; remove spaces if pasted as shown.
if os.getenv("SMTP_PASSWORD"):
    os.environ["SMTP_PASSWORD"] = "".join(os.environ["SMTP_PASSWORD"].split())

if ENV_FILE.exists():
    print(f"Loaded server settings from: {ENV_FILE}", flush=True)
else:
    print("No server/.env file found; using local code-in-terminal mode.", flush=True)
if os.getenv("DEV_PRINT_EMAIL_CODE", "false").lower() == "true":
    print("LOCAL TEST MODE: confirmation codes will appear in this terminal; no email is sent.", flush=True)
elif smtp_configured:
    print(f"SMTP mode enabled for host {os.getenv('SMTP_HOST')}:{os.getenv('SMTP_PORT', '587')}; secrets are not displayed.", flush=True)
else:
    print("SMTP is incomplete and code-in-terminal mode was explicitly disabled; email send will fail until config is complete.", flush=True)

import uvicorn  # noqa: E402
uvicorn.run("main:app", host="127.0.0.1", port=8000, reload=False)
