package com.tienlo.game;

import android.app.Activity;
import android.app.AlertDialog;
import android.content.Intent;
import android.graphics.Color;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.view.View;
import android.view.WindowInsets;
import android.view.WindowInsetsController;
import android.view.WindowManager;
import android.webkit.CookieManager;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceError;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.Button;
import android.widget.FrameLayout;
import android.widget.LinearLayout;
import android.widget.TextView;
import java.util.Collections;

/** Small online client: the VPS owns the renderer, assets, accounts and saves. */
public final class MainActivity extends Activity {
    private static final String HOST = "tienlo2d.xyz";
    private static final String GAME = "https://" + HOST + "/";
    private WebView web;
    private LinearLayout error;
    private FrameLayout root;

    @Override public void onCreate(Bundle state) {
        super.onCreate(state);
        getWindow().addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
        root = new FrameLayout(this);
        root.setBackgroundColor(Color.rgb(12, 25, 35));
        setContentView(root);
        web = new WebView(this);
        root.addView(web, new FrameLayout.LayoutParams(-1, -1));
        WebView.setWebContentsDebuggingEnabled(false);
        WebSettings settings = web.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setAllowFileAccess(false);
        settings.setAllowContentAccess(false);
        settings.setMixedContentMode(WebSettings.MIXED_CONTENT_NEVER_ALLOW);
        settings.setSupportZoom(false);
        settings.setBuiltInZoomControls(false);
        settings.setDisplayZoomControls(false);
        settings.setTextZoom(100);
        settings.setMediaPlaybackRequiresUserGesture(false);
        settings.setUserAgentString(settings.getUserAgentString() + " TienLoAndroid/0.1");
        CookieManager.getInstance().setAcceptCookie(true);
        CookieManager.getInstance().setAcceptThirdPartyCookies(web, false);
        web.setWebChromeClient(new WebChromeClient());
        web.setWebViewClient(new WebViewClient() {
            @Override public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
                Uri uri = request.getUrl();
                if ("https".equals(uri.getScheme()) && HOST.equalsIgnoreCase(uri.getHost()) && (uri.getPort() == -1 || uri.getPort() == 443)) return false;
                if (request.isForMainFrame() && ("https".equals(uri.getScheme()) || "http".equals(uri.getScheme()))) {
                    try { startActivity(new Intent(Intent.ACTION_VIEW, uri)); } catch (Exception ignored) { }
                }
                return true;
            }
            @Override public void onPageFinished(WebView view, String url) { CookieManager.getInstance().flush(); immersive(); }
            @Override public void onReceivedError(WebView view, WebResourceRequest request, WebResourceError problem) {
                if (request.isForMainFrame()) showError();
            }
            @Override public void onReceivedHttpError(WebView view, WebResourceRequest request, WebResourceResponse response) {
                if (request.isForMainFrame() && response.getStatusCode() >= 400) showError();
            }
        });
        if (Build.VERSION.SDK_INT >= 30) {
            getWindow().setDecorFitsSystemWindows(false);
            root.setOnApplyWindowInsetsListener((view, insets) -> {
                android.graphics.Insets cutout = insets.getInsets(WindowInsets.Type.displayCutout());
                android.graphics.Insets keyboard = insets.getInsets(WindowInsets.Type.ime());
                root.setPadding(cutout.left, cutout.top, cutout.right, Math.max(cutout.bottom, keyboard.bottom));
                return insets;
            });
        }
        load();
    }

    private void load() {
        if (error != null) error.setVisibility(View.GONE);
        // Only the entry HTML bypasses cache; versioned JS/CSS/art retain HTTP caching.
        web.loadUrl(GAME, Collections.singletonMap("Cache-Control", "no-cache"));
    }
    private void showError() {
        if (error == null) {
            error = new LinearLayout(this); error.setOrientation(LinearLayout.VERTICAL);
            error.setGravity(android.view.Gravity.CENTER); error.setPadding(24, 24, 24, 24); error.setBackgroundColor(Color.rgb(12, 25, 35));
            TextView text = new TextView(this); text.setText("Tiên Lộ\nKhông tải được game. Kiểm tra kết nối mạng rồi thử lại."); text.setTextColor(Color.rgb(214, 232, 221)); text.setTextSize(18); text.setGravity(android.view.Gravity.CENTER);
            Button retry = new Button(this); retry.setText("Thử lại"); retry.setOnClickListener(view -> load());
            error.addView(text); error.addView(retry); root.addView(error, new FrameLayout.LayoutParams(-1, -1));
        }
        error.setVisibility(View.VISIBLE);
    }
    private void immersive() {
        if (Build.VERSION.SDK_INT >= 30) {
            WindowInsetsController controller = getWindow().getInsetsController();
            if (controller != null) { controller.hide(WindowInsets.Type.systemBars()); controller.setSystemBarsBehavior(WindowInsetsController.BEHAVIOR_SHOW_TRANSIENT_BARS_BY_SWIPE); }
        } else getWindow().getDecorView().setSystemUiVisibility(5894);
    }
    @Override public void onWindowFocusChanged(boolean focused) { super.onWindowFocusChanged(focused); if (focused) immersive(); }
    @Override protected void onResume() { super.onResume(); if (web != null) { web.onResume(); web.resumeTimers(); immersive(); } }
    @Override protected void onPause() {
        if (web != null) { web.evaluateJavascript("window.dispatchEvent(new Event('blur'));if(window.account)account.flush().catch(()=>{});", null); CookieManager.getInstance().flush(); web.onPause(); web.pauseTimers(); }
        super.onPause();
    }
    @Override public void onBackPressed() {
        web.evaluateJavascript("(()=>{if(window.worldMap?.dialog.isOpen()){worldMap.dialog.close();return true;}if(window.mobileHUD){mobileHUD.closeMenu();}return false;})()", handled -> {
            if (!"true".equals(handled)) new AlertDialog.Builder(this).setMessage("Thoát Tiên Lộ?").setNegativeButton("Tiếp tục", null).setPositiveButton("Thoát", (dialog, which) -> finish()).show();
        });
    }
    @Override protected void onDestroy() { if (web != null) { root.removeView(web); web.destroy(); } super.onDestroy(); }
}
