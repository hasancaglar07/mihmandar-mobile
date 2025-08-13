package com.mihmandarmobile.widget

import android.app.PendingIntent
import android.appwidget.AppWidgetManager
import android.appwidget.AppWidgetProvider
import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.graphics.Color
import android.net.Uri
import android.util.Log
import android.widget.RemoteViews
import kotlinx.coroutines.*
import java.net.URL
import org.json.JSONObject
import java.text.SimpleDateFormat
import java.util.*

class PrayerWidgetProvider : AppWidgetProvider() {

    companion object {
        const val ACTION_WIDGET_CLICK = "com.mihmandarmobile.widget.WIDGET_CLICK"
        const val ACTION_REFRESH = "com.mihmandarmobile.widget.REFRESH"
    }

    override fun onUpdate(context: Context, appWidgetManager: AppWidgetManager, appWidgetIds: IntArray) {
        for (appWidgetId in appWidgetIds) {
            updateWidget(context, appWidgetManager, appWidgetId)
        }
    }

    override fun onReceive(context: Context, intent: Intent) {
        super.onReceive(context, intent)
        
            val mgr = AppWidgetManager.getInstance(context)
            val cn = ComponentName(context, PrayerWidgetProvider::class.java)
        
        when (intent.action) {
            AppWidgetManager.ACTION_APPWIDGET_UPDATE,
            ACTION_REFRESH -> {
            onUpdate(context, mgr, mgr.getAppWidgetIds(cn))
            }
            ACTION_WIDGET_CLICK -> {
                // Open main app when widget is clicked
                val mainIntent = context.packageManager.getLaunchIntentForPackage(context.packageName)
                mainIntent?.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                context.startActivity(mainIntent)
            }
        }
    }

    private fun updateWidget(context: Context, manager: AppWidgetManager, appWidgetId: Int) {
        val views = RemoteViews(context.packageName, com.mihmandarmobile.R.layout.prayer_widget_layout)

        // Set up click intents
        setupClickIntents(context, views, appWidgetId)

        // Get saved coordinates and theme preferences
        val prefs = context.getSharedPreferences("prayer_prefs", Context.MODE_PRIVATE)
        var lat = prefs.getString("lat", null)
        var lng = prefs.getString("lng", null)
        val themeData = prefs.getString("theme", null)

        // If no coordinates in prayer_prefs, check location_prefs
        if (lat == null || lng == null) {
            val locationPrefs = context.getSharedPreferences("location_prefs", Context.MODE_PRIVATE)
            lat = locationPrefs.getString("lat", null)
            lng = locationPrefs.getString("lng", null)
            
            // If found in location_prefs, save to prayer_prefs for future use
            if (lat != null && lng != null) {
                prefs.edit()
                    .putString("lat", lat)
                    .putString("lng", lng)
                    .apply()
            }
        }

        // Try to get location from current app location
        if (lat == null || lng == null) {
            try {
                // Check if there's a cached location from the main app
                val sharedPrefs = context.getSharedPreferences("app_location", Context.MODE_PRIVATE)
                lat = sharedPrefs.getString("current_lat", null)
                lng = sharedPrefs.getString("current_lng", null)
                
                if (lat != null && lng != null) {
                    // Cache for widget
                    prefs.edit()
                        .putString("lat", lat)
                        .putString("lng", lng)
                        .apply()
                }
            } catch (e: Exception) {
                e.printStackTrace()
            }
        }

        // Apply theme if available
        applyTheme(views, themeData)

        // Show loading state
        views.setTextViewText(com.mihmandarmobile.R.id.tvNext, "Sıradaki: Yükleniyor...")
        views.setTextViewText(com.mihmandarmobile.R.id.tvTime, "--:--")
        views.setTextViewText(com.mihmandarmobile.R.id.tvRemaining, "⏳ Güncelleniyor...")
        updateHijriDate(views)
        
        manager.updateAppWidget(appWidgetId, views)

        // Debug: Log all coordinate sources
        Log.d("WidgetDebug", "=== WIDGET COORDINATE DEBUG ===")
        Log.d("WidgetDebug", "prayer_prefs lat: ${prefs.getString("lat", "NULL")}")
        Log.d("WidgetDebug", "prayer_prefs lng: ${prefs.getString("lng", "NULL")}")
        
        val locationPrefs = context.getSharedPreferences("location_prefs", Context.MODE_PRIVATE)
        Log.d("WidgetDebug", "location_prefs lat: ${locationPrefs.getString("lat", "NULL")}")
        Log.d("WidgetDebug", "location_prefs lng: ${locationPrefs.getString("lng", "NULL")}")
        
        val appLocationPrefs = context.getSharedPreferences("app_location", Context.MODE_PRIVATE)
        Log.d("WidgetDebug", "app_location current_lat: ${appLocationPrefs.getString("current_lat", "NULL")}")
        Log.d("WidgetDebug", "app_location current_lng: ${appLocationPrefs.getString("current_lng", "NULL")}")
        Log.d("WidgetDebug", "Final lat: $lat, Final lng: $lng")
        Log.d("WidgetDebug", "=== END WIDGET DEBUG ===")

        // Fetch prayer times asynchronously
        if (lat != null && lng != null) {
            fetchPrayerTimes(context, views, manager, appWidgetId, lat, lng)
        } else {
            showErrorState(views, manager, appWidgetId, "Konum bulunamadı - Debug: prayer_prefs, location_prefs, app_location hepsi boş")
        }
    }

    private fun setupClickIntents(context: Context, views: RemoteViews, appWidgetId: Int) {
        // Main widget click - open app
        val clickIntent = Intent(context, PrayerWidgetProvider::class.java).apply {
            action = ACTION_WIDGET_CLICK
        }
        val clickPendingIntent = PendingIntent.getBroadcast(
            context, appWidgetId, clickIntent, 
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )
        views.setOnClickPendingIntent(com.mihmandarmobile.R.id.tvNext, clickPendingIntent)
        views.setOnClickPendingIntent(com.mihmandarmobile.R.id.tvTime, clickPendingIntent)

        // Refresh click
        val refreshIntent = Intent(context, PrayerWidgetProvider::class.java).apply {
            action = ACTION_REFRESH
        }
        val refreshPendingIntent = PendingIntent.getBroadcast(
            context, appWidgetId, refreshIntent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )
        views.setOnClickPendingIntent(com.mihmandarmobile.R.id.tvLastUpdate, refreshPendingIntent)
    }

    private fun applyTheme(views: RemoteViews, themeData: String?) {
        if (themeData != null) {
            try {
                val theme = JSONObject(themeData)
                val primaryColor = Color.parseColor(theme.getString("primaryColor"))
                val textColor = Color.parseColor(theme.getString("textColor"))
                val accentColor = Color.parseColor(theme.getString("accentColor"))

                views.setTextColor(com.mihmandarmobile.R.id.tvNext, primaryColor)
                views.setTextColor(com.mihmandarmobile.R.id.tvTime, textColor)
                views.setTextColor(com.mihmandarmobile.R.id.tvHijriDate, accentColor)
            } catch (e: Exception) {
                // Use default colors if theme parsing fails
            }
        }
    }

    private fun updateHijriDate(views: RemoteViews) {
        try {
            val hijriDate = getHijriDate()
            views.setTextViewText(com.mihmandarmobile.R.id.tvHijriDate, "🌙 $hijriDate")
        } catch (e: Exception) {
            views.setTextViewText(com.mihmandarmobile.R.id.tvHijriDate, "🌙 Hijri")
        }
    }

    private fun getHijriDate(): String {
        return try {
            // Simple approximation - in real app, use proper Hijri calendar library
            val now = Calendar.getInstance()
            val year = now.get(Calendar.YEAR)
            val hijriYear = year - 622 + 1
            val months = arrayOf("Muharrem", "Safer", "Rabiulevvel", "Rabiulahir", 
                               "Cemaziyelevvel", "Cemaziyelahir", "Recep", "Şaban", 
                               "Ramazan", "Şevval", "Zilkade", "Zilhicce")
            val month = months[now.get(Calendar.MONTH)]
            val day = now.get(Calendar.DAY_OF_MONTH)
            "$day $month $hijriYear"
        } catch (e: Exception) {
            "Hijri Takvim"
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
        GlobalScope.launch(Dispatchers.IO) {
            try {
                val tzOffset = TimeZone.getDefault().rawOffset / 60000
                val today = SimpleDateFormat("yyyy-MM-dd", Locale.getDefault()).format(Date())
                
                val apiUrl = "https://vakit.vercel.app/api/timesForGPS?lat=$lat&lng=$lng&date=$today&days=1&timezoneOffset=$tzOffset&calculationMethod=Turkey&lang=tr"
                val response = URL(apiUrl).readText()
                val json = JSONObject(response)
                
                val prayerTimes = parsePrayerTimes(json)
                val nextPrayer = findNextPrayer(prayerTimes)
                
                withContext(Dispatchers.Main) {
                    updateWidgetWithPrayerData(views, manager, appWidgetId, nextPrayer, prayerTimes)
                }
                
                // Save last update time
                val prefs = context.getSharedPreferences("prayer_prefs", Context.MODE_PRIVATE)
                prefs.edit().putLong("last_update", System.currentTimeMillis()).apply()
                
            } catch (e: Exception) {
                withContext(Dispatchers.Main) {
                    showErrorState(views, manager, appWidgetId, "Güncelleme hatası")
                }
            }
        }
    }

    private fun parsePrayerTimes(json: JSONObject): Map<String, String> {
        val times = mutableMapOf<String, String>()
        
        try {
            val timesObj = json.optJSONObject("times")
                if (timesObj != null) {
                    val dateKey = timesObj.keys().asSequence().firstOrNull()
                if (dateKey != null) {
                    val arr = timesObj.getJSONArray(dateKey)
                    times["İmsak"] = arr.getString(0)
                    times["Güneş"] = arr.getString(1)
                    times["Öğle"] = arr.getString(2)
                    times["İkindi"] = arr.getString(3)
                    times["Akşam"] = arr.getString(4)
                    times["Yatsı"] = arr.getString(5)
                }
                } else {
                val arr = json.optJSONArray("times")
                    if (arr != null && arr.length() > 0) {
                        val first = arr.getJSONObject(0)
                    times["İmsak"] = first.optString("fajr", first.optString("imsak", ""))
                    times["Güneş"] = first.optString("sunrise", first.optString("gunes", ""))
                    times["Öğle"] = first.optString("dhuhr", first.optString("ogle", ""))
                    times["İkindi"] = first.optString("asr", first.optString("ikindi", ""))
                    times["Akşam"] = first.optString("maghrib", first.optString("aksam", ""))
                    times["Yatsı"] = first.optString("isha", first.optString("yatsi", ""))
                }
            }
        } catch (e: Exception) {
            e.printStackTrace()
        }
        
        return times
    }

    private fun findNextPrayer(prayerTimes: Map<String, String>): Triple<String, String, Int> {
        val now = Calendar.getInstance()
        val prayerOrder = listOf("İmsak", "Güneş", "Öğle", "İkindi", "Akşam", "Yatsı")
        
        for (prayerName in prayerOrder) {
            val time = prayerTimes[prayerName] ?: continue
            val timeParts = time.split(":")
            if (timeParts.size >= 2) {
                val prayerCal = Calendar.getInstance().apply {
                    set(Calendar.HOUR_OF_DAY, timeParts[0].toInt())
                    set(Calendar.MINUTE, timeParts[1].toInt())
                    set(Calendar.SECOND, 0)
                }
                
                if (prayerCal.timeInMillis >= now.timeInMillis) {
                    val remainingMinutes = ((prayerCal.timeInMillis - now.timeInMillis) / 60000).toInt()
                    return Triple(prayerName, time, remainingMinutes)
                }
            }
        }
        
        // If no prayer found for today, get tomorrow's first prayer
        val tomorrowImsak = prayerTimes["İmsak"] ?: "05:00"
        val tomorrowCal = Calendar.getInstance().apply {
            add(Calendar.DAY_OF_MONTH, 1)
            val timeParts = tomorrowImsak.split(":")
            set(Calendar.HOUR_OF_DAY, timeParts[0].toInt())
            set(Calendar.MINUTE, if (timeParts.size > 1) timeParts[1].toInt() else 0)
            set(Calendar.SECOND, 0)
        }
        val remainingMinutes = ((tomorrowCal.timeInMillis - now.timeInMillis) / 60000).toInt()
        return Triple("İmsak", tomorrowImsak, remainingMinutes)
    }

    private fun updateWidgetWithPrayerData(
        views: RemoteViews, 
        manager: AppWidgetManager, 
        appWidgetId: Int,
        nextPrayer: Triple<String, String, Int>,
        allPrayerTimes: Map<String, String>
    ) {
        val (name, time, remainingMinutes) = nextPrayer
        
        // Update prayer icon based on prayer name
        val icon = when (name) {
            "İmsak" -> "🌙"
            "Güneş" -> "🌅" 
            "Öğle" -> "☀️"
            "İkindi" -> "🌆"
            "Akşam" -> "🌇"
            "Yatsı" -> "🌃"
            else -> "🕌"
        }
        
        views.setTextViewText(com.mihmandarmobile.R.id.tvPrayerIcon, icon)
        views.setTextViewText(com.mihmandarmobile.R.id.tvNext, "Sıradaki: $name")
        views.setTextViewText(com.mihmandarmobile.R.id.tvTime, time)
        
        // Format remaining time
        val hours = remainingMinutes / 60
        val mins = remainingMinutes % 60
        val remainingText = when {
            hours > 0 -> "⏱ ${hours}s ${mins}dk kaldı"
            mins > 0 -> "⏱ ${mins} dk kaldı"
            else -> "⏱ Şimdi"
        }
        views.setTextViewText(com.mihmandarmobile.R.id.tvRemaining, remainingText)
        
        // Update status indicator
        views.setTextViewText(com.mihmandarmobile.R.id.tvLastUpdate, "●")
        
        // Update all prayer times in mini grid (if layout supports it)
        updateMiniPrayerTimes(views, allPrayerTimes)
        
        manager.updateAppWidget(appWidgetId, views)
    }

    private fun updateMiniPrayerTimes(views: RemoteViews, prayerTimes: Map<String, String>) {
        try {
            // For now, just ensure the basic layout works
            // The mini prayer times will be shown in the new layout
            Log.d("WidgetUpdate", "Updating with times: $prayerTimes")
        } catch (e: Exception) {
            e.printStackTrace()
        }
    }

    private fun showErrorState(views: RemoteViews, manager: AppWidgetManager, appWidgetId: Int, error: String) {
        views.setTextViewText(com.mihmandarmobile.R.id.tvNext, "Sıradaki: --")
        views.setTextViewText(com.mihmandarmobile.R.id.tvTime, "--:--")
        views.setTextViewText(com.mihmandarmobile.R.id.tvRemaining, "❌ $error")
        views.setTextViewText(com.mihmandarmobile.R.id.tvLastUpdate, "⚠")
        manager.updateAppWidget(appWidgetId, views)
    }
}



