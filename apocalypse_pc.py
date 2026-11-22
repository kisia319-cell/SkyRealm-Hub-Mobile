"""Standalone Windows build of the mobile SkyRealm Apocalypse game."""
from __future__ import annotations

import functools
import http.server
import os
import sys
import threading
import traceback
from pathlib import Path
from urllib.parse import urlsplit

import webview

APP_VERSION = "apocalypse-pc-v1.1.7"
PORT = 48732


def resource_path(relative: str) -> Path:
    root = Path(getattr(sys, "_MEIPASS", Path(__file__).resolve().parent))
    return root / "apocalypse" / relative


class ApocalypseApi:
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
                # The shared ApocalypseGame API already exposes save() for the desktop shell.
                html = html.replace(
                    "</body>",
                    '<script src="apocalypse-pc.js"></script></body>',
                )
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
    for filename in ("apocalypse.html", "apocalypse.js", "apocalypse-coop.js", "apocalypse-pc.js", "apocalypse-changelog.js"):
        if not (asset_dir / filename).is_file():
            raise FileNotFoundError(f"Missing bundled Apocalypse asset: {filename}")

    handler = functools.partial(ApocalypseFileHandler, directory=str(asset_dir))
    try:
        server = http.server.ThreadingHTTPServer(("127.0.0.1", PORT), handler)
    except OSError as exc:
        raise RuntimeError(
            f"Не удалось открыть локальный игровой порт {PORT}. "
            "Закрой другое окно Apocalypse и повтори запуск."
        ) from exc
    server.daemon_threads = True
    thread = threading.Thread(target=server.serve_forever, name="ApocalypseHTTP", daemon=True)
    thread.start()

    profile = Path(os.environ.get("LOCALAPPDATA", str(Path.home()))) / "SkyRealm" / "ApocalypsePC" / "webview-profile"
    profile.mkdir(parents=True, exist_ok=True)
    try:
        window = webview.create_window(
            "SkyRealm — Apocalypse",
            f"http://127.0.0.1:{PORT}/apocalypse.html",
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
