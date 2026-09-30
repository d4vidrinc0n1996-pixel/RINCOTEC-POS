package com.rincotec.mostacillas;

import android.app.Activity;
import android.content.ActivityNotFoundException;
import android.content.ContentValues;
import android.content.Intent;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.os.Environment;
import android.print.PrintAttributes;
import android.print.PrintManager;
import android.provider.MediaStore;
import android.util.Base64;
import android.webkit.JavascriptInterface;
import android.webkit.ValueCallback;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceRequest;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.Toast;

import java.io.File;
import java.io.FileOutputStream;
import java.io.OutputStream;

/**
 * Contenedor Android de la app web de mostacillas (carpeta mostacillas/ del
 * repositorio, empaquetada como assets). Agrega lo que el WebView no hace solo:
 * elegir imágenes o proyectos, guardar archivos en Descargas e imprimir.
 */
public class MainActivity extends Activity {

    private static final int FILE_REQUEST = 1;
    private static final String START_URL = "file:///android_asset/index.html";

    private WebView web;
    private WebView printView; // se conserva hasta que termine de imprimir
    private ValueCallback<Uri[]> fileCallback;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        web = new WebView(this);
        setContentView(web);

        WebSettings settings = web.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setAllowFileAccess(true);
        settings.setLoadWithOverviewMode(true);
        settings.setUseWideViewPort(true);
        settings.setBuiltInZoomControls(true);
        settings.setDisplayZoomControls(false);

        web.addJavascriptInterface(new Bridge(), "AndroidBridge");

        web.setWebViewClient(new WebViewClient() {
            @Override
            public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
                Uri uri = request.getUrl();
                String scheme = uri.getScheme();
                if ("file".equals(scheme)) return false;
                // Enlaces externos se abren en el navegador
                try {
                    startActivity(new Intent(Intent.ACTION_VIEW, uri));
                } catch (ActivityNotFoundException e) {
                    toast("No hay una app para abrir este enlace.");
                }
                return true;
            }
        });

        web.setWebChromeClient(new WebChromeClient() {
            @Override
            public boolean onShowFileChooser(WebView view, ValueCallback<Uri[]> callback,
                                             FileChooserParams params) {
                if (fileCallback != null) fileCallback.onReceiveValue(null);
                fileCallback = callback;
                Intent intent = new Intent(Intent.ACTION_GET_CONTENT);
                intent.addCategory(Intent.CATEGORY_OPENABLE);
                intent.setType(mimeFrom(params.getAcceptTypes()));
                try {
                    startActivityForResult(Intent.createChooser(intent, "Elegir archivo"), FILE_REQUEST);
                } catch (ActivityNotFoundException e) {
                    fileCallback = null;
                    toast("No hay una app para elegir archivos.");
                    return false;
                }
                return true;
            }
        });

        if (savedInstanceState != null) {
            web.restoreState(savedInstanceState);
        } else {
            web.loadUrl(START_URL);
        }
    }

    /** Convierte el atributo accept del input (p. ej. "image/*" o ".json") en un tipo MIME. */
    private static String mimeFrom(String[] acceptTypes) {
        if (acceptTypes != null) {
            for (String group : acceptTypes) {
                if (group == null) continue;
                for (String type : group.split(",")) {
                    String t = type.trim();
                    if (t.equals("application/json") || t.equals(".json")) return "*/*";
                    if (t.contains("/")) return t;
                }
            }
        }
        return "*/*";
    }

    @Override
    protected void onActivityResult(int requestCode, int resultCode, Intent data) {
        super.onActivityResult(requestCode, resultCode, data);
        if (requestCode != FILE_REQUEST || fileCallback == null) return;
        Uri[] result = null;
        if (resultCode == RESULT_OK && data != null && data.getData() != null) {
            result = new Uri[]{data.getData()};
        }
        fileCallback.onReceiveValue(result);
        fileCallback = null;
    }

    @Override
    protected void onSaveInstanceState(Bundle outState) {
        super.onSaveInstanceState(outState);
        web.saveState(outState);
    }

    @Override
    public void onBackPressed() {
        if (web.canGoBack()) web.goBack();
        else super.onBackPressed();
    }

    private void toast(final String text) {
        runOnUiThread(() -> Toast.makeText(MainActivity.this, text, Toast.LENGTH_LONG).show());
    }

    /** Funciones que la app web llama como window.AndroidBridge. */
    private class Bridge {

        @JavascriptInterface
        public void saveFile(String filename, String mime, String base64) {
            try {
                byte[] bytes = Base64.decode(base64, Base64.DEFAULT);
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                    ContentValues values = new ContentValues();
                    values.put(MediaStore.Downloads.DISPLAY_NAME, filename);
                    values.put(MediaStore.Downloads.MIME_TYPE, mime);
                    Uri uri = getContentResolver().insert(MediaStore.Downloads.EXTERNAL_CONTENT_URI, values);
                    if (uri == null) throw new IllegalStateException("sin acceso a Descargas");
                    try (OutputStream out = getContentResolver().openOutputStream(uri)) {
                        if (out == null) throw new IllegalStateException("sin acceso a Descargas");
                        out.write(bytes);
                    }
                    toast("Guardado en Descargas: " + filename);
                } else {
                    File dir = getExternalFilesDir(Environment.DIRECTORY_DOWNLOADS);
                    File file = new File(dir, filename);
                    try (FileOutputStream out = new FileOutputStream(file)) {
                        out.write(bytes);
                    }
                    toast("Guardado en " + file.getAbsolutePath());
                }
            } catch (Exception e) {
                toast("No se pudo guardar el archivo: " + e.getMessage());
            }
        }

        @JavascriptInterface
        public void printHtml(final String html) {
            runOnUiThread(() -> {
                WebView view = new WebView(MainActivity.this);
                view.setWebViewClient(new WebViewClient() {
                    @Override
                    public void onPageFinished(WebView v, String url) {
                        PrintManager manager = (PrintManager) getSystemService(PRINT_SERVICE);
                        manager.print("Patrón de mostacillas",
                                v.createPrintDocumentAdapter("patron-mostacillas"),
                                new PrintAttributes.Builder().build());
                    }
                });
                printView = view;
                view.loadDataWithBaseURL(null, html, "text/html", "UTF-8", null);
            });
        }
    }
}
