package com.skyrealm.hub;

import android.app.Activity;
import android.app.DownloadManager;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.IntentFilter;
import android.content.SharedPreferences;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.os.Environment;
import android.provider.Settings;
import android.view.View;
import android.view.WindowManager;
import android.webkit.JavascriptInterface;
import android.webkit.WebChromeClient;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.Toast;

public class MainActivity extends Activity {
    private WebView webView;
    private String currentScreen = "hub";
    private long updateDownloadId = -1L;
    private static final String HUB = "file:///android_asset/hub.html";
    private static final String LAUNCHER = "file:///android_asset/skyrealm/index.html";
    private static final String GAME = "file:///android_asset/skyrealm/game/index.html";
    private static final String APOCALYPSE = "file:///android_asset/apocalypse.html";
    private static final String UPDATE_URL = "https://github.com/kisia319-cell/SkyRealm-Hub-Mobile/releases/latest/download/app-debug.apk";
    private static final String PREFS = "skyrealm_hub_updates";
    private static final String PENDING_INSTALL = "pending_install_uri";

    private final BroadcastReceiver downloadReceiver = new BroadcastReceiver() {
        @Override public void onReceive(Context context, Intent intent) {
            long id = intent.getLongExtra(DownloadManager.EXTRA_DOWNLOAD_ID, -1L);
            if (id != updateDownloadId) return;
            DownloadManager manager = (DownloadManager) getSystemService(DOWNLOAD_SERVICE);
            if (manager == null) return;
            DownloadManager.Query query = new DownloadManager.Query().setFilterById(id);
            try (android.database.Cursor cursor = manager.query(query)) {
                if (cursor == null || !cursor.moveToFirst()) {
                    showToast("Не удалось проверить загруженное обновление.");
                    return;
                }
                int status = cursor.getInt(cursor.getColumnIndexOrThrow(DownloadManager.COLUMN_STATUS));
                if (status != DownloadManager.STATUS_SUCCESSFUL) {
                    int reason = cursor.getInt(cursor.getColumnIndexOrThrow(DownloadManager.COLUMN_REASON));
                    showToast("Загрузка обновления не завершилась. Код: " + reason);
                    return;
                }
                Uri apkUri = manager.getUriForDownloadedFile(id);
                if (apkUri == null) {
                    showToast("APK загружен, но Android не смог открыть файл.");
                    return;
                }
                getUpdatePrefs().edit().putString(PENDING_INSTALL, apkUri.toString()).apply();
                installPendingUpdate();
            } catch (Exception e) {
                showToast("Ошибка подготовки установки: " + e.getMessage());
            }
        }
    };

    @Override public void onCreate(Bundle state) {
        super.onCreate(state);
        getWindow().setFlags(WindowManager.LayoutParams.FLAG_FULLSCREEN, WindowManager.LayoutParams.FLAG_FULLSCREEN);
        getWindow().getDecorView().setSystemUiVisibility(View.SYSTEM_UI_FLAG_FULLSCREEN | View.SYSTEM_UI_FLAG_HIDE_NAVIGATION | View.SYSTEM_UI_FLAG_IMMERSIVE_STICKY | View.SYSTEM_UI_FLAG_LAYOUT_FULLSCREEN | View.SYSTEM_UI_FLAG_LAYOUT_HIDE_NAVIGATION | View.SYSTEM_UI_FLAG_LAYOUT_STABLE);
        IntentFilter filter = new IntentFilter(DownloadManager.ACTION_DOWNLOAD_COMPLETE);
        if (Build.VERSION.SDK_INT >= 33) registerReceiver(downloadReceiver, filter, Context.RECEIVER_EXPORTED);
        else registerReceiver(downloadReceiver, filter);

        webView = new WebView(this);
        WebSettings settings = webView.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setAllowFileAccess(true);
        settings.setAllowContentAccess(true);
        settings.setJavaScriptCanOpenWindowsAutomatically(true);
        settings.setSupportMultipleWindows(false);
        webView.setWebChromeClient(new WebChromeClient());
        webView.setWebViewClient(new WebViewClient() {
            @Override public void onPageFinished(WebView view, String url) {
                if (url.contains("/skyrealm/index.html")) {
                    String shim = "(function(){window.pywebview=window.pywebview||{};window.pywebview.api={" +
                      "launch_game:function(p){AndroidBridge.launchGame(JSON.stringify(p||{}));return Promise.resolve({ok:true});}," +
                      "close:function(){return Promise.resolve({ok:true});}," +
                      "minimize:function(){return Promise.resolve({ok:true});}," +
                      "get_launcher_settings:function(){return Promise.resolve({ok:true,settings:{}});}," +
                      "save_launcher_settings:function(p){return Promise.resolve({ok:true});}," +
                      "open_data_folder:function(){return Promise.resolve({ok:false,message:'Недоступно на Android'});}" +
                      "};window.dispatchEvent(new Event('pywebviewready'));})();";
                    view.evaluateJavascript(shim, null);
                }
            }
        });
        webView.addJavascriptInterface(new Bridge(), "AndroidBridge");
        setContentView(webView);
        webView.loadUrl(HUB);
    }

    private SharedPreferences getUpdatePrefs() {
        return getSharedPreferences(PREFS, MODE_PRIVATE);
    }

    private void showToast(String message) {
        runOnUiThread(() -> Toast.makeText(MainActivity.this, message, Toast.LENGTH_LONG).show());
    }

    private boolean hasAsset(String path) {
        try (java.io.InputStream stream = getAssets().open(path)) {
            return stream != null;
        } catch (Exception ignored) {
            return false;
        }
    }

    private void installPendingUpdate() {
        String pending = getUpdatePrefs().getString(PENDING_INSTALL, "");
        if (pending.isEmpty()) return;
        if (Build.VERSION.SDK_INT >= 26 && !getPackageManager().canRequestPackageInstalls()) {
            Intent permission = new Intent(Settings.ACTION_MANAGE_UNKNOWN_APP_SOURCES,
                    Uri.parse("package:" + getPackageName()));
            permission.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            startActivity(permission);
            showToast("Разреши установку APK для SkyRealm Hub, затем вернись в приложение.");
            return;
        }
        getUpdatePrefs().edit().remove(PENDING_INSTALL).apply();
        try {
            Intent install = new Intent(Intent.ACTION_VIEW);
            install.setDataAndType(Uri.parse(pending), "application/vnd.android.package-archive");
            install.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION | Intent.FLAG_ACTIVITY_NEW_TASK);
            startActivity(install);
        } catch (Exception e) {
            showToast("APK скачан. Открой уведомление загрузки и подтверди установку.");
        }
    }

    private void startUpdateDownload() {
        try {
            DownloadManager manager = (DownloadManager) getSystemService(DOWNLOAD_SERVICE);
            if (manager == null) throw new IllegalStateException("Download Manager недоступен.");
            DownloadManager.Request request = new DownloadManager.Request(Uri.parse(UPDATE_URL));
            request.setTitle("Обновление SkyRealm Hub");
            request.setDescription("Загрузка новой версии игры и Hub");
            request.setMimeType("application/vnd.android.package-archive");
            request.setNotificationVisibility(DownloadManager.Request.VISIBILITY_VISIBLE_NOTIFY_COMPLETED);
            request.setDestinationInExternalFilesDir(this, Environment.DIRECTORY_DOWNLOADS, "SkyRealm-Hub-update.apk");
            request.setAllowedOverMetered(true);
            request.setAllowedOverRoaming(true);
            updateDownloadId = manager.enqueue(request);
            showToast("Обновление загружается. После загрузки Android предложит установить APK.");
        } catch (Exception e) {
            showToast("Не удалось начать загрузку обновления: " + e.getMessage());
        }
    }

    private class Bridge {
        @JavascriptInterface public void openLauncher() { runOnUiThread(() -> { currentScreen = "launcher"; webView.loadUrl(LAUNCHER); }); }
        @JavascriptInterface public void openApocalypse() { runOnUiThread(() -> { currentScreen = "apocalypse"; webView.loadUrl(APOCALYPSE); }); }
        @JavascriptInterface public void launchGame(String preferences) { runOnUiThread(() -> { currentScreen = "game"; webView.loadUrl(GAME); }); }
        @JavascriptInterface public void goHub() { runOnUiThread(() -> { currentScreen = "hub"; webView.loadUrl(HUB); }); }
        @JavascriptInterface public boolean isGameInstalled(String id) {
            if ("apocalypse".equalsIgnoreCase(id)) return hasAsset("apocalypse.html");
            if ("skyrealm".equalsIgnoreCase(id)) return hasAsset("skyrealm/index.html") && hasAsset("skyrealm/game/index.html");
            return false;
        }
        @JavascriptInterface public String getAppVersion() { return BuildConfig.VERSION_NAME; }
        @JavascriptInterface public void openUpdate() { runOnUiThread(() -> startUpdateDownload()); }
    }

    @Override protected void onResume() {
        super.onResume();
        installPendingUpdate();
    }

    @Override protected void onDestroy() {
        try { unregisterReceiver(downloadReceiver); } catch (Exception ignored) {}
        if (webView != null) webView.destroy();
        super.onDestroy();
    }

    @Override public void onBackPressed() {
        if ("game".equals(currentScreen)) { currentScreen = "launcher"; webView.loadUrl(LAUNCHER); }
        else if ("launcher".equals(currentScreen) || "apocalypse".equals(currentScreen)) { currentScreen = "hub"; webView.loadUrl(HUB); }
        else { super.onBackPressed(); }
    }
}
