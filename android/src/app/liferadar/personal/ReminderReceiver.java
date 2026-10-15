package app.liferadar.personal;

import android.app.*;
import android.content.*;
import android.net.Uri;
import android.os.Build;
import org.json.*;

public final class ReminderReceiver extends BroadcastReceiver {
    static final String PREFS="life-radar-reminders", KEY="pending", CHANNEL="life-radar-tasks";
    static PendingIntent alarmIntent(Context context,String id,String title) {
        Intent intent=new Intent(context,ReminderReceiver.class).setAction("app.liferadar.REMIND").setData(Uri.parse("liferadar://reminder/"+Uri.encode(id))).putExtra("id",id).putExtra("title",title);
        return PendingIntent.getBroadcast(context,0,intent,PendingIntent.FLAG_UPDATE_CURRENT|PendingIntent.FLAG_IMMUTABLE);
    }
    static void schedule(Context context,String json) {
        try {
            JSONArray next=new JSONArray(json);if(next.length()>1000)return;
            AlarmManager alarms=(AlarmManager)context.getSystemService(Context.ALARM_SERVICE);
            android.content.SharedPreferences prefs=context.getSharedPreferences(PREFS,Context.MODE_PRIVATE);
            JSONArray previous=new JSONArray(prefs.getString(KEY,"[]"));
            for(int i=0;i<previous.length();i++){JSONObject item=previous.getJSONObject(i);alarms.cancel(alarmIntent(context,item.getString("id"),""));}
            prefs.edit().putString(KEY,json).apply();
            NotificationManager manager=(NotificationManager)context.getSystemService(Context.NOTIFICATION_SERVICE);
            manager.createNotificationChannel(new NotificationChannel(CHANNEL,"Task reminders",NotificationManager.IMPORTANCE_DEFAULT));
            for(int i=0;i<next.length();i++){JSONObject item=next.getJSONObject(i);long at=item.getLong("at");if(at>System.currentTimeMillis())alarms.setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP,at,alarmIntent(context,item.getString("id"),item.getString("title")));}
        } catch(Exception ignored) { }
    }
    @Override public void onReceive(Context context,Intent intent) {
        if(Intent.ACTION_BOOT_COMPLETED.equals(intent.getAction()) || Intent.ACTION_MY_PACKAGE_REPLACED.equals(intent.getAction())) {
            schedule(context,context.getSharedPreferences(PREFS,Context.MODE_PRIVATE).getString(KEY,"[]"));return;
        }
        if(!"app.liferadar.REMIND".equals(intent.getAction()))return;
        if(Build.VERSION.SDK_INT>=33 && context.checkSelfPermission("android.permission.POST_NOTIFICATIONS")!=android.content.pm.PackageManager.PERMISSION_GRANTED)return;
        NotificationManager manager=(NotificationManager)context.getSystemService(Context.NOTIFICATION_SERVICE);
        manager.createNotificationChannel(new NotificationChannel(CHANNEL,"Task reminders",NotificationManager.IMPORTANCE_DEFAULT));
        PendingIntent open=PendingIntent.getActivity(context,0,new Intent(context,MainActivity.class),PendingIntent.FLAG_UPDATE_CURRENT|PendingIntent.FLAG_IMMUTABLE);
        String title=intent.getStringExtra("title");
        Notification notification=new Notification.Builder(context,CHANNEL).setSmallIcon(android.R.drawable.ic_popup_reminder).setContentTitle("Life Radar reminder").setContentText(title).setStyle(new Notification.BigTextStyle().bigText(title)).setContentIntent(open).setAutoCancel(true).build();
        manager.notify(intent.getStringExtra("id"),1,notification);
    }
}
