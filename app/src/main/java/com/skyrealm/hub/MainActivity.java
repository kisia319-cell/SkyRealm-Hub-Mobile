package com.skyrealm.hub;

import android.app.Activity;
import android.os.Bundle;
import android.view.View;
import android.view.Window;
import android.view.WindowManager;
import android.webkit.JavascriptInterface;
import android.webkit.WebChromeClient;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;

public class MainActivity extends Activity {
    private WebView webView;
    private String currentScreen = "hub";
    private static final String HUB = "file:///android_asset/hub.html";
    private static final String LAUNCHER = "file:///android_asset/skyrealm/index.html";
    private static final String GAME = "file:///android_asset/skyrealm/game/index.html";

    @Override public void onCreate(Bundle state) {
        super.onCreate(state);
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

    private class Bridge {
        @JavascriptInterface public void openLauncher() { runOnUiThread(() -> { currentScreen = "launcher"; webView.loadUrl(LAUNCHER); }); }
        @JavascriptInterface public void launchGame(String preferences) { runOnUiThread(() -> { currentScreen = "game"; webView.loadUrl(GAME); }); }
        @JavascriptInterface public void goHub() { runOnUiThread(() -> { currentScreen = "hub"; webView.loadUrl(HUB); }); }
    }

    @Override public void onBackPressed() {
        if ("game".equals(currentScreen)) { currentScreen = "launcher"; webView.loadUrl(LAUNCHER); }
        else if ("launcher".equals(currentScreen)) { currentScreen = "hub"; webView.loadUrl(HUB); }
        else { super.onBackPressed(); }
    }
}
