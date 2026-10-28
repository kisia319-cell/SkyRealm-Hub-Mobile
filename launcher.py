"""SkyRealm desktop launcher and lightweight local game installer."""
import os
import shutil
import subprocess
import sys
import time
import json
import functools
import http.server
import threading
from urllib.parse import urlencode
from pathlib import Path

import webview


def resource_path(name: str) -> str:
    """Resolve bundled resources in source mode and in PyInstaller one-file mode."""
    base = Path(getattr(sys, "_MEIPASS", Path(__file__).resolve().parent))
    return str(base / name)


window = None
game_window = None
game_fullscreen = False

DEFAULT_SETTINGS = {
    "resolution": "1280x720",
    "windowMode": "windowed",
    "graphicsQuality": "medium",
    "uiScale": "100",
    "showVitals": True,
    "showQuest": True,
    "showControls": True,
    "showInventory": True,
    "adminMode": False,
    "moderatorMode": False,
}


def settings_file() -> Path:
    app_data = Path(os.environ.get("LOCALAPPDATA") or (Path.home() / "AppData" / "Local"))
    directory = app_data / "SkyRealm"
    directory.mkdir(parents=True, exist_ok=True)
    return directory / "settings.json"


def normalize_settings(value=None) -> dict:
    settings = dict(DEFAULT_SETTINGS)
    if isinstance(value, dict):
        settings.update(value)
    if settings.get("resolution") not in {"1280x720", "1600x900", "1920x1080", "1280x960", "1440x900"}:
        settings["resolution"] = DEFAULT_SETTINGS["resolution"]
    if settings.get("windowMode") not in {"windowed", "fullscreen"}:
        settings["windowMode"] = DEFAULT_SETTINGS["windowMode"]
    if settings.get("graphicsQuality") not in {"low", "medium", "high"}:
        settings["graphicsQuality"] = DEFAULT_SETTINGS["graphicsQuality"]
    if str(settings.get("uiScale")) not in {"85", "100", "115"}:
        settings["uiScale"] = DEFAULT_SETTINGS["uiScale"]
    else:
        settings["uiScale"] = str(settings["uiScale"])
    for key in ("showVitals", "showQuest", "showControls", "showInventory"):
        settings[key] = settings.get(key) is not False
    settings["adminMode"] = settings.get("adminMode") is True
    settings["moderatorMode"] = settings.get("moderatorMode") is True
    return settings


def read_user_settings() -> dict:
    try:
        return normalize_settings(json.loads(settings_file().read_text(encoding="utf-8")))
    except (OSError, ValueError, TypeError):
        return dict(DEFAULT_SETTINGS)


def save_user_settings(value) -> dict:
    settings = normalize_settings(value)
    settings_file().write_text(json.dumps(settings, ensure_ascii=False, indent=2), encoding="utf-8")
    return settings


def resolution_size(settings: dict) -> tuple[int, int]:
    try:
        width, height = str(settings.get("resolution", "1280x720")).split("x", 1)
        return max(850, int(width)), max(540, int(height))
    except (TypeError, ValueError):
        return 1280, 720


def _js_update(percent: int, stage: str, detail: str) -> None:
    """Update the launch progress overlay; strings are JS-escaped by JSON encoding."""
    import json
    if window is None:
        return
    try:
        payload = json.dumps([int(percent), stage, detail], ensure_ascii=False)
        window.evaluate_js("if (window.setGameProgress) window.setGameProgress.apply(null, " + payload + ");")
    except Exception:
        # UI may not be ready during startup. The actual install can still continue.
        pass


class LauncherApi:
    def minimize(self):
        try:
            window.minimize()
        except Exception:
            pass

    def close(self):
        try:
            window.destroy()
        except Exception:
            pass

    def open_data_folder(self):
        """Open the local SkyRealm data folder in the system file manager."""
        try:
            app_data = Path(os.environ.get("LOCALAPPDATA") or (Path.home() / "AppData" / "Local"))
            directory = app_data / "SkyRealm"
            directory.mkdir(parents=True, exist_ok=True)
            if os.name == "nt":
                os.startfile(str(directory))
            elif sys.platform == "darwin":
                subprocess.Popen(["open", str(directory)])
            else:
                subprocess.Popen(["xdg-open", str(directory)])
            return {"ok": True, "path": str(directory)}
        except Exception as exc:
            return {"ok": False, "message": "Не удалось открыть папку данных: " + str(exc)}

    def get_launcher_settings(self):
        return {"ok": True, "settings": read_user_settings()}

    def save_launcher_settings(self, settings):
        try:
            saved = save_user_settings(settings)
            return {"ok": True, "settings": saved}
        except Exception as exc:
            return {"ok": False, "message": "Не удалось сохранить настройки: " + str(exc)}

    def launch_game(self, settings=None):
        """Install the bundled prototype into LocalAppData and start it in a new process."""
        try:
            preferences = save_user_settings(settings if isinstance(settings, dict) else read_user_settings())
            source_dir = Path(resource_path("game")).resolve()
            source_index = source_dir / "index.html"
            source_version = source_dir / "version.txt"
            if not source_index.is_file() or not source_version.is_file():
                return {"ok": False, "message": "В сборке лаунчера отсутствуют файлы игры. Пересобери EXE из полного архива."}

            version = source_version.read_text(encoding="utf-8").strip()
            app_data = Path(os.environ.get("LOCALAPPDATA") or (Path.home() / "AppData" / "Local"))
            install_dir = app_data / "SkyRealm" / "game"
            installed_index = install_dir / "index.html"
            installed_version_file = install_dir / "version.txt"
            installed_version = ""
            try:
                installed_version = installed_version_file.read_text(encoding="utf-8").strip()
            except OSError:
                pass

            already_installed = installed_index.is_file() and installed_version == version
            _js_update(8, "Проверяем установку…", "Проверяем версию игры на этом компьютере")
            time.sleep(0.25)

            if already_installed:
                _js_update(72, "Игра уже установлена", "Проверяем целостность основных файлов")
                required = [install_dir / "game.js", install_dir / "index.html"]
                if not all(p.is_file() for p in required):
                    already_installed = False
                time.sleep(0.2)

            if not already_installed:
                _js_update(18, "Подготавливаем файлы…", "Создаём папку установки SkyRealm")
                install_dir.mkdir(parents=True, exist_ok=True)
                all_files = sorted(p for p in source_dir.rglob("*") if p.is_file())
                if not all_files:
                    return {"ok": False, "message": "Пакет игры пустой."}
                total = len(all_files)
                for index, source_file in enumerate(all_files, start=1):
                    relative = source_file.relative_to(source_dir)
                    destination = install_dir / relative
                    destination.parent.mkdir(parents=True, exist_ok=True)
                    shutil.copy2(source_file, destination)
                    progress = 20 + int((index / total) * 66)
                    if relative.name == "index.html":
                        detail = "Устанавливаем карту и игровой интерфейс"
                    elif relative.name == "game.js":
                        detail = "Устанавливаем персонажа и управление"
                    else:
                        detail = "Копируем игровые ресурсы"
                    _js_update(progress, "Устанавливаем игру…", detail)
                    time.sleep(0.14)

            if not installed_index.is_file() or not (install_dir / "game.js").is_file():
                return {"ok": False, "message": "Установка не завершилась: не найдены основные файлы игры."}

            _js_update(92, "Всё готово", "Открываем отдельное окно игры")
            time.sleep(0.25)
            if getattr(sys, "frozen", False):
                # Launch a SEPARATELY BUILT game runner stored outside this launcher's
                # temporary PyInstaller _MEI directory. The main launcher may then close
                # without deleting files still used by the game process.
                bundled_runner = Path(resource_path("bin/SkyRealmGame.exe"))
                bundled_runner_version = Path(resource_path("game_runner_version.txt"))
                if not bundled_runner.is_file() or not bundled_runner_version.is_file():
                    return {"ok": False, "message": "В сборке отсутствует отдельный игровой запускатель. Пересобери EXE через build_exe.bat из полного архива."}
                runner_version = bundled_runner_version.read_text(encoding="utf-8").strip()
                safe_version = "".join(ch if ch.isalnum() else "_" for ch in runner_version).strip("_") or "current"
                runner_dir = app_data / "SkyRealm" / "bin"
                runner_dir.mkdir(parents=True, exist_ok=True)
                runner_path = runner_dir / ("SkyRealmGame_" + safe_version + ".exe")
                if (not runner_path.is_file()) or runner_path.stat().st_size != bundled_runner.stat().st_size:
                    temp_runner = runner_path.with_suffix(".exe.new")
                    shutil.copy2(bundled_runner, temp_runner)
                    os.replace(temp_runner, runner_path)
                command = [str(runner_path), "--skyrealm-game", str(installed_index)]
            else:
                # Source-mode development still works with the current Python interpreter.
                command = [sys.executable, str(Path(__file__).resolve()), "--skyrealm-game", str(installed_index)]
            creationflags = getattr(subprocess, "CREATE_NEW_PROCESS_GROUP", 0) if os.name == "nt" else 0
            subprocess.Popen(
                command,
                cwd=str(install_dir),
                close_fds=True,
                creationflags=creationflags,
                env=os.environ.copy(),
            )
            _js_update(100, "Запускаем SkyRealm…", "Лаунчер закроется через мгновение")
            return {"ok": True, "installed": not already_installed, "version": version}
        except Exception as exc:
            return {"ok": False, "message": "Ошибка подготовки игры: " + str(exc)}


class GameApi:
    def close(self):
        try:
            game_window.destroy()
        except Exception:
            pass

    def apply_settings(self, settings):
        global game_fullscreen
        try:
            saved = save_user_settings(settings)
            desired_fullscreen = saved["windowMode"] == "fullscreen"
            width, height = resolution_size(saved)
            if game_window is not None:
                if game_fullscreen and not desired_fullscreen:
                    game_window.toggle_fullscreen()
                    game_fullscreen = False
                    time.sleep(0.12)
                    game_window.resize(width, height)
                elif not game_fullscreen and desired_fullscreen:
                    game_window.resize(width, height)
                    time.sleep(0.12)
                    game_window.toggle_fullscreen()
                    game_fullscreen = True
                elif not game_fullscreen:
                    game_window.resize(width, height)
            return {"ok": True, "settings": saved}
        except Exception as exc:
            return {"ok": False, "message": "Не удалось применить настройки окна: " + str(exc)}

    def toggle_fullscreen(self):
        settings = read_user_settings()
        settings["windowMode"] = "windowed" if settings.get("windowMode") == "fullscreen" else "fullscreen"
        result = self.apply_settings(settings)
        result["windowMode"] = settings["windowMode"]
        return result


class QuietGameFileHandler(http.server.SimpleHTTPRequestHandler):
    """Serve local game assets over loopback HTTP instead of a file:// URL.

    WebView2 on some Windows setups can fail to open a file URL after a one-file
    executable has unpacked/cleaned its temporary directory. The game is installed
    in LocalAppData, and this server only binds to 127.0.0.1.
    """
    def log_message(self, format, *args):
        pass


def run_game_window(game_html: str) -> None:
    """Run the game in its own lightweight window, serving installed files over loopback."""
    global game_window, game_fullscreen
    file_path = Path(game_html).resolve()
    if not file_path.is_file():
        raise FileNotFoundError("Не найден файл игры: " + str(file_path))
    settings = read_user_settings()
    width, height = resolution_size(settings)
    game_fullscreen = settings["windowMode"] == "fullscreen"

    # Use a stable port so the game's localStorage (save data/preferences) persists
    # between runs. If another app occupies it, pick an available port for this run.
    handler = functools.partial(QuietGameFileHandler, directory=str(file_path.parent))
    try:
        local_server = http.server.ThreadingHTTPServer(("127.0.0.1", 48731), handler)
    except OSError:
        local_server = http.server.ThreadingHTTPServer(("127.0.0.1", 0), handler)
    local_server.daemon_threads = True
    server_thread = threading.Thread(target=local_server.serve_forever, name="SkyRealmGameHTTP", daemon=True)
    server_thread.start()

    port = local_server.server_address[1]
    page_url = "http://127.0.0.1:" + str(port) + "/" + file_path.name + "?" + urlencode({"settings": json.dumps(settings, ensure_ascii=False)})
    try:
        game_window = webview.create_window(
            "SkyRealm — Первый рассвет",
            page_url,
            width=width,
            height=height,
            min_size=(850, 540),
            background_color="#07111f",
            text_select=False,
            fullscreen=game_fullscreen,
            js_api=GameApi(),
        )
        # Diagnostic build: enable WebView2 DevTools so JavaScript errors can be inspected.
        webview.start(debug=True)
    finally:
        local_server.shutdown()
        local_server.server_close()


if __name__ == "__main__":
    if len(sys.argv) >= 3 and sys.argv[1] == "--skyrealm-game":
        run_game_window(sys.argv[2])
    else:
        html = Path(resource_path("index.html")).resolve().as_uri()
        api = LauncherApi()
        window = webview.create_window(
            "SkyRealm Launcher",
            html,
            width=1440,
            height=940,
            min_size=(900, 680),
            background_color="#071020",
            text_select=False,
            js_api=api,
        )
        webview.start(debug=False)
