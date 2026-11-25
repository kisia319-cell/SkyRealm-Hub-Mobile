package com.skyrealm.hub;

import android.app.Activity;
import android.content.Intent;
import android.net.Uri;
import android.os.Bundle;
import android.view.View;
import android.view.Window;
import android.view.WindowManager;
import android.webkit.JavascriptInterface;
import android.webkit.WebChromeClient;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.speech.tts.TextToSpeech;
import java.util.ArrayDeque;
import java.util.Locale;

public class MainActivity extends Activity {
    private WebView webView;
    private String currentScreen = "hub";
    private TextToSpeech russianTts;
    private boolean ttsReady = false;
    private boolean russianAvailable = false;
    private boolean installPromptOpened = false;
    private final ArrayDeque<String> pendingRussianSpeech = new ArrayDeque<>();
    private static final String HUB = "file:///android_asset/hub.html";
    private static final String APOCALYPSE = "file:///android_asset/apocalypse.html";
    private static final String LAUNCHER = "file:///android_asset/skyrealm/index.html";
    private static final String GAME = "file:///android_asset/skyrealm/game/index.html";
    private static final String RELEASES = "https://github.com/kisia319-cell/SkyRealm-Hub-Mobile/releases/latest";

    @Override public void onCreate(Bundle state) {
        super.onCreate(state);
        initRussianSpeech();
        getWindow().setFlags(WindowManager.LayoutParams.FLAG_FULLSCREEN, WindowManager.LayoutParams.FLAG_FULLSCREEN);
        getWindow().getDecorView().setSystemUiVisibility(View.SYSTEM_UI_FLAG_FULLSCREEN | View.SYSTEM_UI_FLAG_HIDE_NAVIGATION | View.SYSTEM_UI_FLAG_IMMERSIVE_STICKY | View.SYSTEM_UI_FLAG_LAYOUT_FULLSCREEN | View.SYSTEM_UI_FLAG_LAYOUT_HIDE_NAVIGATION | View.SYSTEM_UI_FLAG_LAYOUT_STABLE);
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

    private void initRussianSpeech() {
        try {
            russianTts = new TextToSpeech(this, status -> {
                if (status != TextToSpeech.SUCCESS || russianTts == null) return;
                ttsReady = true;
                int language = russianTts.setLanguage(new Locale("ru", "RU"));
                russianAvailable = language != TextToSpeech.LANG_MISSING_DATA
                    && language != TextToSpeech.LANG_NOT_SUPPORTED;
                if (russianAvailable) {
                    russianTts.setSpeechRate(0.88f);
                    russianTts.setPitch(0.82f);
                    while (!pendingRussianSpeech.isEmpty()) speakRussianNow(pendingRussianSpeech.removeFirst());
                } else {
                    pendingRussianSpeech.clear();
                }
            });
        } catch (Exception ignored) {
            ttsReady = false;
            russianAvailable = false;
        }
    }

    private void refreshRussianTtsLanguage() {
        if (russianTts == null || !ttsReady) return;
        int language = russianTts.setLanguage(new Locale("ru", "RU"));
        russianAvailable = language != TextToSpeech.LANG_MISSING_DATA
            && language != TextToSpeech.LANG_NOT_SUPPORTED;
        if (russianAvailable) {
            russianTts.setSpeechRate(0.88f);
            russianTts.setPitch(0.82f);
            synchronized (pendingRussianSpeech) {
                while (!pendingRussianSpeech.isEmpty()) speakRussianNow(pendingRussianSpeech.removeFirst());
            }
        }
    }

    private void speakRussianNow(String text) {
        if (russianTts == null || !russianAvailable || text == null || text.trim().isEmpty()) return;
        if (android.os.Build.VERSION.SDK_INT >= 21) {
            android.os.Bundle params = new android.os.Bundle();
            params.putFloat(TextToSpeech.Engine.KEY_PARAM_VOLUME, 1.0f);
            russianTts.speak(text, TextToSpeech.QUEUE_ADD, params, "apocalypse-ru-" + System.nanoTime());
        } else {
            russianTts.speak(text, TextToSpeech.QUEUE_ADD, null);
        }
    }

    private class Bridge {
        @JavascriptInterface public boolean speakRussian(String text) {
            if (text == null || text.trim().isEmpty()) return false;
            synchronized (pendingRussianSpeech) {
                if (russianAvailable && ttsReady) {
                    runOnUiThread(() -> speakRussianNow(text));
                    return true;
                }
                if (pendingRussianSpeech.size() < 8) pendingRussianSpeech.addLast(text);
                return false;
            }
        }
        @JavascriptInterface public void stopRussianSpeech() {
            runOnUiThread(() -> {
                pendingRussianSpeech.clear();
                if (russianTts != null) russianTts.stop();
            });
        }
        @JavascriptInterface public boolean isRussianVoiceAvailable() {
            return ttsReady && russianAvailable;
        }
        @JavascriptInterface public void installRussianVoice() {
            runOnUiThread(() -> {
                if (installPromptOpened) return;
                installPromptOpened = true;
                try {
                    startActivity(new Intent(TextToSpeech.Engine.ACTION_INSTALL_TTS_DATA));
                } catch (Exception ignored) {
                    installPromptOpened = false;
                }
            });
        }
        @JavascriptInterface public void openLauncher() { runOnUiThread(() -> { currentScreen = "launcher"; webView.loadUrl(LAUNCHER); }); }
        @JavascriptInterface public void openApocalypse() { runOnUiThread(() -> { currentScreen = "apocalypse"; webView.loadUrl(APOCALYPSE); }); }
        @JavascriptInterface public void launchGame(String preferences) { runOnUiThread(() -> { currentScreen = "game"; webView.loadUrl(GAME); }); }
        @JavascriptInterface public void goHub() { runOnUiThread(() -> { currentScreen = "hub"; webView.loadUrl(HUB); }); }
        @JavascriptInterface public boolean isGameInstalled(String game) {
            try {
                String asset = "skyrealm".equals(game) ? "skyrealm/index.html" : ("apocalypse".equals(game) ? "apocalypse.html" : "");
                if (asset.isEmpty()) return false;
                getAssets().open(asset).close();
                return true;
            } catch (Exception ignored) { return false; }
        }
        @JavascriptInterface public String getAppVersion() {
            try { return getPackageManager().getPackageInfo(getPackageName(), 0).versionName; }
            catch (Exception ignored) { return "0.0.0"; }
        }
        @JavascriptInterface public void openUpdate() {
            runOnUiThread(() -> {
                try { startActivity(new Intent(Intent.ACTION_VIEW, Uri.parse(RELEASES))); }
                catch (Exception ignored) { }
            });
        }
    }

    @Override protected void onResume() {
        super.onResume();
        refreshRussianTtsLanguage();
    }

    @Override protected void onDestroy() {
        if (russianTts != null) {
            russianTts.stop();
            russianTts.shutdown();
            russianTts = null;
        }
        super.onDestroy();
    }

    @Override public void onBackPressed() {
        if ("game".equals(currentScreen)) { currentScreen = "launcher"; webView.loadUrl(LAUNCHER); }
        else if ("apocalypse".equals(currentScreen)) { currentScreen = "hub"; webView.loadUrl(HUB); }
        else if ("launcher".equals(currentScreen)) { currentScreen = "hub"; webView.loadUrl(HUB); }
        else { super.onBackPressed(); }
    }
}
