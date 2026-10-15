package app.liferadar.personal;

import android.app.Activity;
import android.app.AlertDialog;
import android.content.Intent;
import android.graphics.Color;
import android.net.Uri;
import android.os.Bundle;
import android.webkit.*;
import android.widget.Toast;
import java.io.*;
import java.nio.charset.StandardCharsets;
import java.util.*;

public final class MainActivity extends Activity {
    private WebView web;
    private ValueCallback<Uri[]> upload;
    private String pendingExport;
    private String pendingReminders = "[]";
    private String cameraInsets = "{\"left\":0,\"width\":0,\"top\":0}";
    private static final String HOST = "appassets.androidplatform.net";
    private static final Set<String> FILES = new HashSet<>(Arrays.asList("index.html","app.js","ui.js","styles.css","theme.css","pages.css"));
    @Override public void onCreate(Bundle state) {
        super.onCreate(state);
        getWindow().setStatusBarColor(Color.rgb(17,21,40));
        getWindow().setNavigationBarColor(Color.rgb(17,21,40));
        web = new WebView(this);
        web.setBackgroundColor(Color.rgb(17,21,40));
        android.widget.FrameLayout root = new android.widget.FrameLayout(this);
        root.setBackgroundColor(Color.rgb(17,21,40));
        root.addView(web,new android.widget.FrameLayout.LayoutParams(-1,-1));
        setContentView(root);
        if (android.os.Build.VERSION.SDK_INT >= 30) {
            getWindow().setDecorFitsSystemWindows(false);
            android.view.WindowManager.LayoutParams layout = getWindow().getAttributes();
            layout.layoutInDisplayCutoutMode = android.view.WindowManager.LayoutParams.LAYOUT_IN_DISPLAY_CUTOUT_MODE_ALWAYS;
            getWindow().setAttributes(layout);
            root.setOnApplyWindowInsetsListener((view,insets)->{
                android.graphics.Insets safe = insets.getInsets(android.view.WindowInsets.Type.systemBars() | android.view.WindowInsets.Type.displayCutout() | android.view.WindowInsets.Type.ime());
                // Draw from y=0. Reserve only the camera's actual horizontal bounds in the web header.
                view.setPadding(safe.left,0,safe.right,safe.bottom);
                android.view.DisplayCutout cutout = insets.getDisplayCutout();
                root.post(()->publishCameraInsets(cutout,safe.left));
                return android.view.WindowInsets.CONSUMED;
            });
            root.requestApplyInsets();
            android.view.WindowInsetsController controller = getWindow().getInsetsController();
            if(controller!=null){
                controller.setSystemBarsBehavior(android.view.WindowInsetsController.BEHAVIOR_SHOW_TRANSIENT_BARS_BY_SWIPE);
                controller.hide(android.view.WindowInsets.Type.statusBars());
            }
        } else {
            getWindow().addFlags(android.view.WindowManager.LayoutParams.FLAG_FULLSCREEN);
        }
        if (android.os.Build.VERSION.SDK_INT >= 33) {
            getOnBackInvokedDispatcher().registerOnBackInvokedCallback(android.window.OnBackInvokedDispatcher.PRIORITY_DEFAULT,()->handleBack());
        }
        WebSettings settings = web.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setAllowFileAccess(false);
        settings.setAllowContentAccess(true);
        settings.setMixedContentMode(WebSettings.MIXED_CONTENT_NEVER_ALLOW);
        settings.setSupportMultipleWindows(false);
        web.addJavascriptInterface(new BackupBridge(), "AndroidBackup");
        web.setWebViewClient(new WebViewClient() {
            @Override public void onPageFinished(WebView view,String url){applyCameraInsets();}
            @Override public WebResourceResponse shouldInterceptRequest(WebView view, WebResourceRequest request) {
                Uri url = request.getUrl();
                String path = url.getPath();
                if ("https".equals(url.getScheme()) && HOST.equals(url.getHost()) && path != null && path.startsWith("/assets/")) {
                    String file = path.substring(8);
                    if (FILES.contains(file)) try {
                        String mime = file.endsWith(".js") ? "text/javascript" : file.endsWith(".css") ? "text/css" : "text/html";
                        Map<String,String> headers = new HashMap<>();
                        headers.put("Cache-Control", "no-cache");
                        headers.put("Content-Security-Policy", "default-src 'self' data:; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'none'");
                        return new WebResourceResponse(mime,"UTF-8",200,"OK",headers,getAssets().open(file));
                    } catch (IOException ignored) { }
                }
                return new WebResourceResponse("text/plain","UTF-8",403,"Blocked",Collections.emptyMap(),new ByteArrayInputStream(new byte[0]));
            }
            @Override public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
                return !("https".equals(request.getUrl().getScheme()) && HOST.equals(request.getUrl().getHost()));
            }
        });
        web.setWebChromeClient(new WebChromeClient() {
            @Override public boolean onJsConfirm(WebView view, String url, String message, JsResult result) {
                new AlertDialog.Builder(MainActivity.this).setMessage(message).setPositiveButton("Confirm",(d,w)->result.confirm()).setNegativeButton("Cancel",(d,w)->result.cancel()).setOnCancelListener(d->result.cancel()).show(); return true;
            }
            @Override public boolean onShowFileChooser(WebView view, ValueCallback<Uri[]> callback, FileChooserParams params) {
                if(upload != null) upload.onReceiveValue(null);
                upload=callback;
                try { Intent intent=new Intent(Intent.ACTION_OPEN_DOCUMENT);intent.addCategory(Intent.CATEGORY_OPENABLE);intent.setType("application/json"); startActivityForResult(intent,20); }
                catch (Exception ex) { upload.onReceiveValue(null); upload=null; Toast.makeText(MainActivity.this,"No file picker available",Toast.LENGTH_SHORT).show(); }
                return true;
            }
        });
        web.loadUrl("https://"+HOST+"/assets/index.html");
    }
    private void publishCameraInsets(android.view.DisplayCutout cutout,int leftInset) {
        int start=Integer.MAX_VALUE,end=0,bottom=0;
        if(cutout!=null)for(android.graphics.Rect rect:cutout.getBoundingRects()){
            if(rect.top<=0 && rect.bottom>0){start=Math.min(start,rect.left);end=Math.max(end,rect.right);bottom=Math.max(bottom,rect.bottom);}
        }
        int width=web.getWidth();
        if(width>0 && start!=Integer.MAX_VALUE){
            float left=Math.max(0,start-leftInset)*100f/width;
            float gap=Math.max(0,end-start)*100f/width;
            float top=bottom/getResources().getDisplayMetrics().density;
            cameraInsets=String.format(Locale.US,"{\"left\":%.3f,\"width\":%.3f,\"top\":%.3f}",left,gap,top);
        }else cameraInsets="{\"left\":0,\"width\":0,\"top\":0}";
        applyCameraInsets();
    }
    private void applyCameraInsets(){web.evaluateJavascript("window.LifeRadarInsets&&window.LifeRadarInsets("+cameraInsets+")",null);}
    public final class BackupBridge {
        @JavascriptInterface public void syncReminders(String json) {
            if(json==null || json.length()>1000000)return;
            runOnUiThread(()->{
                pendingReminders=json;
                ReminderReceiver.schedule(MainActivity.this,json);
                if(!"[]".equals(json) && android.os.Build.VERSION.SDK_INT>=33 && checkSelfPermission("android.permission.POST_NOTIFICATIONS")!=android.content.pm.PackageManager.PERMISSION_GRANTED && !getPreferences(MODE_PRIVATE).getBoolean("askedNotifications",false)) {
                    getPreferences(MODE_PRIVATE).edit().putBoolean("askedNotifications",true).apply();
                    requestPermissions(new String[]{"android.permission.POST_NOTIFICATIONS"},30);
                }
            });
        }
        @JavascriptInterface public void notificationSettings() {
            runOnUiThread(()->{Intent intent=new Intent(android.provider.Settings.ACTION_APP_NOTIFICATION_SETTINGS);intent.putExtra(android.provider.Settings.EXTRA_APP_PACKAGE,getPackageName());startActivity(intent);});
        }
        @JavascriptInterface public void exportJson(String json) {
            if(json==null || json.length()>6000000) return;
            runOnUiThread(()->{
                if(pendingExport!=null) return;
                pendingExport=json;
                Intent intent=new Intent(Intent.ACTION_CREATE_DOCUMENT);intent.addCategory(Intent.CATEGORY_OPENABLE);intent.setType("application/json");intent.putExtra(Intent.EXTRA_TITLE,"life-radar-backup.json");
                try { startActivityForResult(intent,21); } catch(Exception ex){ pendingExport=null;Toast.makeText(MainActivity.this,"Could not open backup destination",Toast.LENGTH_LONG).show(); }
            });
        }
    }
    @Override protected void onActivityResult(int request,int result,Intent intent) {
        super.onActivityResult(request,result,intent);
        if(request==20 && upload!=null){upload.onReceiveValue(result==RESULT_OK && intent!=null && intent.getData()!=null ? new Uri[]{intent.getData()} : null);upload=null;}
        if(request==21){
            final String json=pendingExport;pendingExport=null;
            if(result!=RESULT_OK || intent==null || intent.getData()==null || json==null)return;
            final Uri target=intent.getData();
            new Thread(()->{try(OutputStream stream=getContentResolver().openOutputStream(target,"wt")){if(stream==null)throw new IOException();stream.write(json.getBytes(StandardCharsets.UTF_8));runOnUiThread(()->Toast.makeText(this,"Backup saved",Toast.LENGTH_SHORT).show());}catch(Exception ex){runOnUiThread(()->Toast.makeText(this,"Backup could not be saved",Toast.LENGTH_LONG).show());}}).start();
        }
    }
    private void handleBack(){web.evaluateJavascript("(()=>{const d=document.querySelector('dialog[open]');if(d){d.close();return true;}if(globalThis.LifeRadar&&LifeRadar.currentView()!=='today'){LifeRadar.navigate('today');return true;}return false;})()",result->{if(!"true".equals(result))finish();});}
    @Override public void onBackPressed(){handleBack();}
    @Override public void onRequestPermissionsResult(int request,String[] permissions,int[] results){super.onRequestPermissionsResult(request,permissions,results);if(request==30){ReminderReceiver.schedule(this,pendingReminders);Toast.makeText(this,results.length>0 && results[0]==android.content.pm.PackageManager.PERMISSION_GRANTED ? "Task notifications enabled" : "Enable Life Radar notifications in app settings to receive reminders",Toast.LENGTH_LONG).show();}}
    @Override protected void onPause(){super.onPause();web.onPause();}
    @Override protected void onResume(){super.onResume();if(web!=null)web.onResume();}
    @Override public void onWindowFocusChanged(boolean focused){super.onWindowFocusChanged(focused);if(focused && android.os.Build.VERSION.SDK_INT>=30){android.view.WindowInsetsController controller=getWindow().getInsetsController();if(controller!=null)controller.hide(android.view.WindowInsets.Type.statusBars());}}
    @Override protected void onDestroy(){if(upload!=null)upload.onReceiveValue(null);web.destroy();super.onDestroy();}
}
