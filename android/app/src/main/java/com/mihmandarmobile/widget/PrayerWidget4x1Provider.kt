package com.mihmandarmobile.widget

import android.app.PendingIntent
import android.appwidget.AppWidgetManager
import android.appwidget.AppWidgetProvider
import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.widget.RemoteViews
import kotlinx.coroutines.*
import java.net.URL
import org.json.JSONObject
import java.text.SimpleDateFormat
import java.util.*

class PrayerWidget4x1Provider : AppWidgetProvider() {

    companion object {
        const val ACTION_WIDGET_CLICK = "com.mihmandarmobile.widget.4x1.WIDGET_CLICK"
        const val ACTION_REFRESH = "com.mihmandarmobile.widget.4x1.REFRESH"
    }

    override fun onUpdate(context: Context, appWidgetManager: AppWidgetManager, appWidgetIds: IntArray) {
        for (appWidgetId in appWidgetIds) {
            updateWidget(context, appWidgetManager, appWidgetId)
        }
    }

    override fun onReceive(context: Context, intent: Intent) {
        super.onReceive(context, intent)
        when (intent.action) {
            ACTION_WIDGET_CLICK -> {
                val launchIntent = context.packageManager.getLaunchIntentForPackage(context.packageName)
                launchIntent?.flags = Intent.FLAG_ACTIVITY_NEW_TASK
                context.startActivity(launchIntent)
            }
            ACTION_REFRESH -> {
                val appWidgetManager = AppWidgetManager.getInstance(context)
                val componentName = ComponentName(context, PrayerWidget4x1Provider::class.java)
                val appWidgetIds = appWidgetManager.getAppWidgetIds(componentName)
                onUpdate(context, appWidgetManager, appWidgetIds)
            }
        }
    }

    private fun updateWidget(context: Context, manager: AppWidgetManager, appWidgetId: Int) {
        val views = RemoteViews(context.packageName, com.mihmandarmobile.R.layout.prayer_widget_4x1)
        
        setupClickIntents(context, views, appWidgetId)
        
        val sharedPrefs = context.getSharedPreferences("widget_prefs", Context.MODE_PRIVATE)
        val lat = sharedPrefs.getString("latitude", "41.0082")
        val lng = sharedPrefs.getString("longitude", "28.9784")
        val themeData = sharedPrefs.getString("theme", null)
        
        applyTheme(views, themeData)
        
        views.setTextViewText(com.mihmandarmobile.R.id.next_prayer_name, "Yükleniyor...")
        views.setTextViewText(com.mihmandarmobile.R.id.next_prayer_time, "--:--")
        views.setTextViewText(com.mihmandarmobile.R.id.remaining_time, "...")
        
        manager.updateAppWidget(appWidgetId, views)
        
        if (lat != null && lng != null) {
            fetchPrayerTimes(context, views, manager, appWidgetId, lat, lng)
        } else {
            showErrorState(views, manager, appWidgetId)
        }
    }

    private fun setupClickIntents(context: Context, views: RemoteViews, appWidgetId: Int) {
        val clickIntent = Intent(context, PrayerWidget4x1Provider::class.java).apply {
            action = ACTION_WIDGET_CLICK
        }
        val clickPendingIntent = PendingIntent.getBroadcast(
            context, appWidgetId, clickIntent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )
        views.setOnClickPendingIntent(com.mihmandarmobile.R.id.next_prayer_name, clickPendingIntent)
        views.setOnClickPendingIntent(com.mihmandarmobile.R.id.next_prayer_time, clickPendingIntent)

        val refreshIntent = Intent(context, PrayerWidget4x1Provider::class.java).apply {
            action = ACTION_REFRESH
        }
        val refreshPendingIntent = PendingIntent.getBroadcast(
            context, appWidgetId, refreshIntent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )
        views.setOnClickPendingIntent(com.mihmandarmobile.R.id.widget_container, refreshPendingIntent)
    }

    private fun applyTheme(views: RemoteViews, themeData: String?) {
        themeData?.let {
            try {
                val theme = JSONObject(it)
                val primaryColor = android.graphics.Color.parseColor(theme.getString("primaryColor"))
                val textColor = android.graphics.Color.parseColor(theme.getString("textColor"))

                views.setTextColor(com.mihmandarmobile.R.id.next_prayer_name, primaryColor)
                views.setTextColor(com.mihmandarmobile.R.id.next_prayer_time, textColor)
            } catch (e: Exception) {
                // Use default colors
            }
        }
    }

    private fun fetchPrayerTimes(
        context: Context, 
        views: RemoteViews, 
        manager: AppWidgetManager, 
        appWidgetId: Int,
        lat: String, 
        lng: String
    ) {
        CoroutineScope(Dispatchers.IO).launch {
            try {
                val today = SimpleDateFormat("dd-MM-yyyy", Locale.getDefault()).format(Date())
                val url = "https://api.aladhan.com/v1/timings/$today?latitude=$lat&longitude=$lng&method=13"
                
                val connection = URL(url).openConnection()
                connection.connectTimeout = 10000
                connection.readTimeout = 10000
                
                val response = connection.getInputStream().bufferedReader().readText()
                val json = JSONObject(response)
                
                if (json.getString("code") == "200") {
                    val timings = json.getJSONObject("data").getJSONObject("timings")
                    val prayerTimes = parsePrayerTimes(timings)
                    val nextPrayer = findNextPrayer(prayerTimes)
                    
                    withContext(Dispatchers.Main) {
                        updateWidgetWithPrayerData(views, manager, appWidgetId, nextPrayer, prayerTimes)
                    }
                } else {
                    withContext(Dispatchers.Main) {
                        showErrorState(views, manager, appWidgetId)
                    }
                }
            } catch (e: Exception) {
                withContext(Dispatchers.Main) {
                    showErrorState(views, manager, appWidgetId)
                }
            }
        }
    }

    private fun parsePrayerTimes(timings: JSONObject): Map<String, String> {
        return mapOf(
            "İmsak" to timings.getString("Imsak").substring(0, 5),
            "Güneş" to timings.getString("Sunrise").substring(0, 5),
            "Öğle" to timings.getString("Dhuhr").substring(0, 5),
            "İkindi" to timings.getString("Asr").substring(0, 5),
            "Akşam" to timings.getString("Maghrib").substring(0, 5),
            "Yatsı" to timings.getString("Isha").substring(0, 5)
        )
    }

    private fun findNextPrayer(prayerTimes: Map<String, String>): Triple<String, String, String> {
        val currentTime = Calendar.getInstance()
        val currentHour = currentTime.get(Calendar.HOUR_OF_DAY)
        val currentMinute = currentTime.get(Calendar.MINUTE)
        val currentSeconds = currentTime.get(Calendar.SECOND)
        val currentTotalSeconds = currentHour * 3600 + currentMinute * 60 + currentSeconds
        
        for ((name, time) in prayerTimes) {
            val timeParts = time.split(":")
            val prayerHour = timeParts[0].toInt()
            val prayerMinute = timeParts[1].toInt()
            val prayerTotalSeconds = prayerHour * 3600 + prayerMinute * 60
            
            if (prayerTotalSeconds > currentTotalSeconds) {
                val remainingSeconds = prayerTotalSeconds - currentTotalSeconds
                val hours = remainingSeconds / 3600
                val minutes = (remainingSeconds % 3600) / 60
                val seconds = remainingSeconds % 60
                
                val remainingText = when {
                    hours > 0 -> "${hours}s ${minutes}dk ${seconds}sn"
                    minutes > 0 -> "${minutes}dk ${seconds}sn"
                    else -> "${seconds}sn"
                }
                
                return Triple(name, time, remainingText)
            }
        }
        
        // If no prayer found for today, return first prayer of tomorrow
        val firstPrayer = prayerTimes.entries.first()
        return Triple(firstPrayer.key, firstPrayer.value, "Yarın")
    }

    private fun updateWidgetWithPrayerData(
        views: RemoteViews, 
        manager: AppWidgetManager, 
        appWidgetId: Int,
        nextPrayer: Triple<String, String, String>,
        allPrayerTimes: Map<String, String>
    ) {
        val (name, time, remainingTime) = nextPrayer
        
        views.setTextViewText(com.mihmandarmobile.R.id.next_prayer_name, name)
        views.setTextViewText(com.mihmandarmobile.R.id.next_prayer_time, time)
        views.setTextViewText(com.mihmandarmobile.R.id.remaining_time, remainingTime)
        
        // Update all prayer times
        views.setTextViewText(com.mihmandarmobile.R.id.imsak_time, allPrayerTimes["İmsak"] ?: "--:--")
        views.setTextViewText(com.mihmandarmobile.R.id.gunes_time, allPrayerTimes["Güneş"] ?: "--:--")
        views.setTextViewText(com.mihmandarmobile.R.id.ogle_time, allPrayerTimes["Öğle"] ?: "--:--")
        views.setTextViewText(com.mihmandarmobile.R.id.ikindi_time, allPrayerTimes["İkindi"] ?: "--:--")
        views.setTextViewText(com.mihmandarmobile.R.id.aksam_time, allPrayerTimes["Akşam"] ?: "--:--")
        views.setTextViewText(com.mihmandarmobile.R.id.yatsi_time, allPrayerTimes["Yatsı"] ?: "--:--")
        
        manager.updateAppWidget(appWidgetId, views)
        
        // Schedule next update in 1 second for countdown
        scheduleNextUpdate(context = manager.toString(), remainingTime)
    }

    private fun scheduleNextUpdate(context: String, remainingTime: String) {
        // Schedule update every second for countdown
        Timer().schedule(object : TimerTask() {
            override fun run() {
                // Update countdown logic here
            }
        }, 1000)
    }

    private fun showErrorState(views: RemoteViews, manager: AppWidgetManager, appWidgetId: Int) {
        views.setTextViewText(com.mihmandarmobile.R.id.next_prayer_name, "Hata")
        views.setTextViewText(com.mihmandarmobile.R.id.next_prayer_time, "--:--")
        views.setTextViewText(com.mihmandarmobile.R.id.remaining_time, "Hata oluştu")
        manager.updateAppWidget(appWidgetId, views)
    }
}