"""Standalone Windows build of the mobile SkyRealm Apocalypse game."""
from __future__ import annotations

import functools
import json
import http.server
import os
import sys
import threading
import traceback
from pathlib import Path
from urllib.parse import urlsplit

import webview

APP_VERSION = "apocalypse-pc-v1.6.1"
# Cinematic remaster: procedural materials, aircraft detail, crash debris and camera cuts.
APOCALYPSE_SETTINGS_PATH = Path(os.environ.get("LOCALAPPDATA", str(Path.home()))) / "PrimeHub" / "apocalypse-settings.json"


def normalize_apocalypse_settings(raw):
    data = raw if isinstance(raw, dict) else {}
    effects = data.get("effects", "high")
    if effects not in ("high", "balanced", "low"):
        effects = "high"
    try:
        joy = max(85, min(135, int(data.get("joy", 100))))
    except (TypeError, ValueError):
        joy = 100
    try:
        infected_cap = max(8, min(24, int(data.get("infectedCap", 18))))
    except (TypeError, ValueError):
        infected_cap = 18
    try:
        event_frequency = max(0.5, min(1.8, float(data.get("eventFrequency", 1))))
    except (TypeError, ValueError):
        event_frequency = 1.0
    try:
        autosave = int(data.get("autosaveSeconds", 5))
    except (TypeError, ValueError):
        autosave = 5
    if autosave not in (5, 10, 15, 30):
        autosave = 5
    return {
        "effects": effects, "joy": joy,
        "motion": data.get("motion", True) is not False,
        "hints": data.get("hints", True) is not False,
        "weather": data.get("weather", True) is not False,
        "ambientAudio": data.get("ambientAudio", True) is not False,
        "infectedCap": infected_cap, "eventFrequency": event_frequency,
        "autosaveSeconds": autosave,
        "autoSprint": data.get("autoSprint") is True,
        "showHydration": data.get("showHydration", True) is not False,
        "survivalDifficulty": data.get("survivalDifficulty") if data.get("survivalDifficulty") in ("easy", "standard", "hard") else "standard",
        "renderDistance": data.get("renderDistance") if data.get("renderDistance") in ("near", "normal", "far") else "normal",
        "showEnemyHealth": data.get("showEnemyHealth", True) is not False,
        "showSurvivalHud": data.get("showSurvivalHud", True) is not False,
    }


def read_apocalypse_settings():
    try:
        supplied = json.loads(os.environ.get("SKYREALM_APOCALYPSE_SETTINGS_JSON", "{}"))
        if isinstance(supplied, dict) and supplied:
            return normalize_apocalypse_settings(supplied)
    except (ValueError, TypeError):
        pass
    try:
        raw = json.loads(APOCALYPSE_SETTINGS_PATH.read_text(encoding="utf-8"))
    except (OSError, ValueError, TypeError):
        raw = {}
    return normalize_apocalypse_settings(raw)


def resource_path(relative: str) -> Path:
    root = Path(getattr(sys, "_MEIPASS", Path(__file__).resolve().parent))
    return root / "apocalypse" / relative


class ApocalypseApi:
    def save_apocalypse_settings(self, payload):
        """Save in-game settings so PrimeHub and Apocalypse share one profile."""
        try:
            settings = normalize_apocalypse_settings(payload)
            APOCALYPSE_SETTINGS_PATH.parent.mkdir(parents=True, exist_ok=True)
            temp = APOCALYPSE_SETTINGS_PATH.with_suffix(".tmp")
            temp.write_text(json.dumps(settings, ensure_ascii=False, indent=2), encoding="utf-8")
            os.replace(temp, APOCALYPSE_SETTINGS_PATH)
            return {"ok": True, "settings": settings}
        except Exception as exc:
            return {"ok": False, "message": str(exc)[:180]}

    def get_primehub_auth(self):
        """Return the already-authenticated PrimeHub session supplied by the launcher."""
        try:
            import json
            session = json.loads(os.environ.get("SKYREALM_PRIMEHUB_SESSION", "{}"))
            if not isinstance(session, dict) or not session.get("access_token"):
                return None
            return {"access_token": session["access_token"], "user": session.get("user") or {}}
        except Exception:
            return None

    def close_app(self):
        try:
            windows = webview.windows
            if windows:
                windows[0].destroy()
            return True
        except Exception:
            return False

    def toggle_fullscreen(self):
        try:
            windows = webview.windows
            if not windows:
                return {"ok": False, "message": "Окно Apocalypse ещё не готово."}
            windows[0].toggle_fullscreen()
            return {"ok": True}
        except Exception as exc:
            return {"ok": False, "message": str(exc)[:180]}


class ApocalypseFileHandler(http.server.SimpleHTTPRequestHandler):
    def log_message(self, fmt, *args):
        pass

    def do_GET(self):
        path = urlsplit(self.path).path
        if path in ("/", "/apocalypse.html"):
            try:
                html = resource_path("apocalypse.html").read_text(encoding="utf-8")
                # PrimeHub and the game share this validated profile. Inject it before
                # apocalypse.js runs so it becomes the active defaults on every launch.
                settings_json = json.dumps(read_apocalypse_settings(), ensure_ascii=False).replace("</", "<\\/")
                settings_script = '<script>window.PRIMEHUB_APOCALYPSE_SETTINGS = ' + settings_json + ';</script>'
                html = html.replace(
                    '<script src="apocalypse.js"></script>',
                    settings_script + '<script src="apocalypse.js"></script>',
                )
                html = html.replace("</body>", '<script src="apocalypse-pc.js"></script></body>')
                payload = html.encode("utf-8")
                self.send_response(200)
                self.send_header("Content-Type", "text/html; charset=utf-8")
                self.send_header("Content-Length", str(len(payload)))
                self.send_header("Cache-Control", "no-store")
                self.end_headers()
                self.wfile.write(payload)
                return
            except Exception:
                self.send_error(500, "Unable to load Apocalypse game content")
                return
        return super().do_GET()


def show_error(message: str) -> None:
    try:
        import ctypes
        ctypes.windll.user32.MessageBoxW(0, message, "SkyRealm Apocalypse", 0x10)
    except Exception:
        pass


def main() -> int:
    asset_dir = resource_path("apocalypse.html").parent
    for filename in ("apocalypse.html", "apocalypse.js", "apocalypse-coop.js", "apocalypse-pc.js", "apocalypse-changelog.js", "apocalypse-cinematic-3d.js"):
        if not (asset_dir / filename).is_file():
            raise FileNotFoundError(f"Missing bundled Apocalypse asset: {filename}")

    handler = functools.partial(ApocalypseFileHandler, directory=str(asset_dir))
    try:
        server = http.server.ThreadingHTTPServer(("127.0.0.1", 0), handler)
        port = server.server_address[1]
    except OSError as exc:
        raise RuntimeError(
            "Не удалось открыть локальный игровой сервер на 127.0.0.1. Повтори запуск."
        ) from exc
    server.daemon_threads = True
    thread = threading.Thread(target=server.serve_forever, name="ApocalypseHTTP", daemon=True)
    thread.start()

    profile = Path(os.environ.get("LOCALAPPDATA", str(Path.home()))) / "SkyRealm" / "ApocalypsePC" / "webview-profile"
    profile.mkdir(parents=True, exist_ok=True)
    try:
        window = webview.create_window(
            "SkyRealm — Apocalypse",
            f"http://127.0.0.1:{port}/apocalypse.html",
            width=1360,
            height=820,
            min_size=(980, 620),
            background_color="#172019",
            text_select=False,
            js_api=ApocalypseApi(),
        )
        webview.start(debug=False, private_mode=False, storage_path=str(profile))
        return 0
    finally:
        server.shutdown()
        server.server_close()


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except SystemExit:
        raise
    except Exception as exc:
        details = f"{exc}\n\n{traceback.format_exc()}"
        try:
            log_dir = Path(os.environ.get("LOCALAPPDATA", str(Path.home()))) / "SkyRealm" / "ApocalypsePC"
            log_dir.mkdir(parents=True, exist_ok=True)
            (log_dir / "startup-error.log").write_text(details, encoding="utf-8")
        except Exception:
            pass
        show_error("Не удалось запустить Apocalypse.\n\n" + str(exc))
        raise SystemExit(1)
