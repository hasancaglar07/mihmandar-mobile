package com.mihmandarmobile.widget

import android.app.PendingIntent
import android.app.AlarmManager
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

class PrayerWidgetCompactProvider : AppWidgetProvider() {

    companion object {
        const val ACTION_WIDGET_CLICK = "com.mihmandarmobile.widget.compact.WIDGET_CLICK"
        const val ACTION_REFRESH = "com.mihmandarmobile.widget.compact.REFRESH"
    }

    override fun onUpdate(context: Context, appWidgetManager: AppWidgetManager, appWidgetIds: IntArray) {
        for (appWidgetId in appWidgetIds) {
            updateWidget(context, appWidgetManager, appWidgetId)
        }
    }

    override fun onReceive(context: Context, intent: Intent) {
        super.onReceive(context, intent)
        
        val mgr = AppWidgetManager.getInstance(context)
        val cn = ComponentName(context, PrayerWidgetCompactProvider::class.java)
        
        when (intent.action) {
            AppWidgetManager.ACTION_APPWIDGET_UPDATE,
            ACTION_REFRESH -> {
                onUpdate(context, mgr, mgr.getAppWidgetIds(cn))
            }
            ACTION_WIDGET_CLICK -> {
                val mainIntent = context.packageManager.getLaunchIntentForPackage(context.packageName)
                mainIntent?.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                context.startActivity(mainIntent)
            }
        }
    }

    private fun updateWidget(context: Context, manager: AppWidgetManager, appWidgetId: Int) {
        val views = RemoteViews(context.packageName, com.mihmandarmobile.R.layout.prayer_widget_compact)

        setupClickIntents(context, views, appWidgetId)

        val prefs = context.getSharedPreferences("prayer_prefs", Context.MODE_PRIVATE)
        val themeData = prefs.getString("theme", null)

        applyTheme(views, themeData)

        views.setTextViewText(com.mihmandarmobile.R.id.next_prayer_name, "Yükleniyor...")
        views.setTextViewText(com.mihmandarmobile.R.id.next_prayer_time, "--:--")
        views.setTextViewText(com.mihmandarmobile.R.id.remaining_time, "...")
        
        manager.updateAppWidget(appWidgetId, views)

        val snapshot = prefs.getString("widget_data", null)
        if (snapshot != null) {
            try {
                val json = org.json.JSONObject(snapshot)
                val next = json.optJSONObject("nextPrayer")
                val name = next?.optString("name", "") ?: ""
                val time = next?.optString("time", "--:--") ?: "--:--"
                val remaining = next?.optInt("remainingMinutes", 0) ?: 0
                updateWidgetWithPrayerData(views, manager, appWidgetId, Triple(name, time, remaining))
                scheduleMinuteRefresh(context, computeTargetMillis(time))
                return
            } catch (_: Exception) {}
        }
        val lat = prefs.getString("lat", null)
        val lng = prefs.getString("lng", null)
        if (lat != null && lng != null) {
            fetchPrayerTimes(context, views, manager, appWidgetId, lat, lng)
        } else {
            showErrorState(views, manager, appWidgetId)
        }
    }

    private fun setupClickIntents(context: Context, views: RemoteViews, appWidgetId: Int) {
        val clickIntent = Intent(context, PrayerWidgetCompactProvider::class.java).apply {
            action = ACTION_WIDGET_CLICK
        }
        val clickPendingIntent = PendingIntent.getBroadcast(
            context, appWidgetId, clickIntent, 
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )
        views.setOnClickPendingIntent(com.mihmandarmobile.R.id.next_prayer_name, clickPendingIntent)
        views.setOnClickPendingIntent(com.mihmandarmobile.R.id.next_prayer_time, clickPendingIntent)

        val refreshIntent = Intent(context, PrayerWidgetCompactProvider::class.java).apply {
            action = ACTION_REFRESH
        }
        val refreshPendingIntent = PendingIntent.getBroadcast(
            context, appWidgetId, refreshIntent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )
        views.setOnClickPendingIntent(com.mihmandarmobile.R.id.widget_container, refreshPendingIntent)
    }

    private fun applyTheme(views: RemoteViews, themeData: String?) {
        // Apply theme colors if available - compact version
        if (themeData != null) {
            try {
                val theme = JSONObject(themeData)
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
        GlobalScope.launch(Dispatchers.IO) {
            try {
                // Use vakit.vercel.app API directly
                val tzOffset = -(TimeZone.getDefault().getOffset(System.currentTimeMillis()) / 60000)
                val today = SimpleDateFormat("yyyy-MM-dd", Locale.getDefault()).format(Date())
                val apiUrl = "https://vakit.vercel.app/api/timesForGPS?lat=$lat&lng=$lng&date=$today&days=1&timezoneOffset=$tzOffset&calculationMethod=Turkey&lang=tr"
                
                val connection = URL(apiUrl).openConnection() as java.net.HttpURLConnection
                connection.requestMethod = "GET"
                connection.connectTimeout = 10000
                connection.readTimeout = 10000
                
                val response = connection.inputStream.bufferedReader().use { it.readText() }
                val json = JSONObject(response)
                val prayerTimes = parsePrayerTimes(json)
                val nextPrayer = findNextPrayer(prayerTimes)
                
                withContext(Dispatchers.Main) {
                    updateWidgetWithPrayerData(views, manager, appWidgetId, nextPrayer)
                    scheduleMinuteRefresh(context, computeTargetMillis(nextPrayer.second))
                    scheduleMidnightRefresh(context)
                }
                
                // Cache response
                val prefs = context.getSharedPreferences("prayer_prefs", Context.MODE_PRIVATE)
                prefs.edit().putString("last_times_compact", response).apply()
                
            } catch (e: Exception) {
                // Try cached data
                val prefs = context.getSharedPreferences("prayer_prefs", Context.MODE_PRIVATE)
                val cached = prefs.getString("last_times_compact", null)
                if (cached != null) {
                    try {
                        val json = JSONObject(cached)
                        val prayerTimes = parsePrayerTimes(json)
                        val nextPrayer = findNextPrayer(prayerTimes)
                        withContext(Dispatchers.Main) {
                            updateWidgetWithPrayerData(views, manager, appWidgetId, nextPrayer)
                        }
                    } catch (ce: Exception) {
                        withContext(Dispatchers.Main) {
                            showErrorState(views, manager, appWidgetId)
                        }
                    }
                } else {
                    withContext(Dispatchers.Main) {
                        showErrorState(views, manager, appWidgetId)
                    }
                }
            }
        }
    }

    private fun computeTargetMillis(time: String): Long {
        return try {
            val parts = time.split(":")
            if (parts.size < 2) return 0L
            val cal = Calendar.getInstance().apply {
                set(Calendar.SECOND, 0)
                set(Calendar.MILLISECOND, 0)
                set(Calendar.HOUR_OF_DAY, parts[0].toInt())
                set(Calendar.MINUTE, parts[1].toInt())
            }
            cal.timeInMillis
        } catch (e: Exception) { 0L }
    }

    private fun scheduleMinuteRefresh(context: Context, targetMillis: Long) {
        if (targetMillis <= 0L) return
        try {
            val now = System.currentTimeMillis()
            if (now >= targetMillis) return
            val nextMinute = ((now / 60000) + 1) * 60000
            if (nextMinute >= targetMillis) return
            val intent = Intent(context, PrayerWidgetCompactProvider::class.java).apply { action = ACTION_REFRESH }
            val pi = PendingIntent.getBroadcast(
                context, 2101, intent, PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
            )
            val am = context.getSystemService(Context.ALARM_SERVICE) as AlarmManager
            am.setExactAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, nextMinute, pi)
        } catch (_: Exception) {}
    }

    private fun scheduleMidnightRefresh(context: Context) {
        try {
            val cal = Calendar.getInstance().apply {
                add(Calendar.DAY_OF_MONTH, 1)
                set(Calendar.HOUR_OF_DAY, 0)
                set(Calendar.MINUTE, 5)
                set(Calendar.SECOND, 0)
                set(Calendar.MILLISECOND, 0)
            }
            val intent = Intent(context, PrayerWidgetCompactProvider::class.java).apply { action = ACTION_REFRESH }
            val pi = PendingIntent.getBroadcast(
                context, 2102, intent, PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
            )
            val am = context.getSystemService(Context.ALARM_SERVICE) as AlarmManager
            am.setExactAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, cal.timeInMillis, pi)
        } catch (_: Exception) {}
    }

    private fun parsePrayerTimes(json: JSONObject): Map<String, String> {
        val times = mutableMapOf<String, String>()
        
        try {
            // Parse vakit.vercel.app format
            val timesObj = json.optJSONObject("times")
            if (timesObj != null && timesObj.length() > 0) {
                val dateKey = timesObj.keys().next()
                val arr = timesObj.getJSONArray(dateKey)
                
                if (arr.length() >= 6) {
                    fun cleanTime(timeStr: String): String {
                        val cleaned = timeStr.split(" ")[0].trim()
                        if (cleaned.matches(Regex("\\d{1,2}:\\d{2}"))) {
                            return cleaned
                        }
                        return ""
                    }
                    
                    times["İmsak"] = cleanTime(arr.getString(0))
                    times["Güneş"] = cleanTime(arr.getString(1))
                    times["Öğle"] = cleanTime(arr.getString(2))
                    times["İkindi"] = cleanTime(arr.getString(3))
                    times["Akşam"] = cleanTime(arr.getString(4))
                    times["Yatsı"] = cleanTime(arr.getString(5))
                    
                    times.entries.removeAll { it.value.isEmpty() }
                }
            }
        } catch (e: Exception) {
            e.printStackTrace()
        }
        
        return times
    }

    private fun findNextPrayer(prayerTimes: Map<String, String>): Triple<String, String, Int> {
        val now = Calendar.getInstance()
        val currentTimeMillis = now.timeInMillis
        
        val prayers = listOf(
            "İmsak" to prayerTimes["İmsak"],
            "Güneş" to prayerTimes["Güneş"],
            "Öğle" to prayerTimes["Öğle"],
            "İkindi" to prayerTimes["İkindi"],
            "Akşam" to prayerTimes["Akşam"],
            "Yatsı" to prayerTimes["Yatsı"]
        )
        
        // Find next prayer today
        for ((name, time) in prayers) {
            if (time.isNullOrEmpty()) continue
            
            val parts = time.split(":")
            if (parts.size != 2) continue
            
            val hour = parts[0].toIntOrNull() ?: continue
            val minute = parts[1].toIntOrNull() ?: continue
            
            if (hour !in 0..23 || minute !in 0..59) continue
            
            val prayerCalendar = Calendar.getInstance().apply {
                set(Calendar.HOUR_OF_DAY, hour)
                set(Calendar.MINUTE, minute)
                set(Calendar.SECOND, 0)
                set(Calendar.MILLISECOND, 0)
            }
            
            if (prayerCalendar.timeInMillis > currentTimeMillis) {
                val remainingMinutes = ((prayerCalendar.timeInMillis - currentTimeMillis) / 60000).toInt()
                return Triple(name, time, remainingMinutes)
            }
        }
        
        // If no prayer left today, return tomorrow's first prayer (İmsak)
        val firstPrayer = prayerTimes["İmsak"] ?: "05:00"
        val parts = firstPrayer.split(":")
        val hour = parts.getOrNull(0)?.toIntOrNull() ?: 5
        val minute = parts.getOrNull(1)?.toIntOrNull() ?: 0
        
        val tomorrowPrayerCalendar = Calendar.getInstance().apply {
            add(Calendar.DAY_OF_MONTH, 1)
            set(Calendar.HOUR_OF_DAY, hour)
            set(Calendar.MINUTE, minute)
            set(Calendar.SECOND, 0)
            set(Calendar.MILLISECOND, 0)
        }
        
        val remainingMinutes = ((tomorrowPrayerCalendar.timeInMillis - currentTimeMillis) / 60000).toInt()
        return Triple("İmsak", firstPrayer, remainingMinutes)
    }

    private fun updateWidgetWithPrayerData(
        views: RemoteViews, 
        manager: AppWidgetManager, 
        appWidgetId: Int,
        nextPrayer: Triple<String, String, Int>
    ) {
        val (name, time, remainingMinutes) = nextPrayer
        
        val icon = when (name) {
            "İmsak" -> "🌙"
            "Güneş" -> "🌅" 
            "Öğle" -> "☀️"
            "İkindi" -> "🌆"
            "Akşam" -> "🌇"
            "Yatsı" -> "🌃"
            else -> "🕌"
        }
        
        views.setTextViewText(com.mihmandarmobile.R.id.next_prayer_name, "Sıradaki: $name")
        views.setTextViewText(com.mihmandarmobile.R.id.next_prayer_time, time)
        
        val remainingText = when {
            remainingMinutes >= 60 -> "${remainingMinutes / 60}s ${remainingMinutes % 60}dk"
            remainingMinutes > 0 -> "${remainingMinutes} dk"
            else -> "Şimdi"
        }
        views.setTextViewText(com.mihmandarmobile.R.id.remaining_time, remainingText)
        
        manager.updateAppWidget(appWidgetId, views)
    }

    private fun showErrorState(views: RemoteViews, manager: AppWidgetManager, appWidgetId: Int) {
        views.setTextViewText(com.mihmandarmobile.R.id.next_prayer_name, "Hata")
        views.setTextViewText(com.mihmandarmobile.R.id.next_prayer_time, "--:--")
        views.setTextViewText(com.mihmandarmobile.R.id.remaining_time, "Hata oluştu")
        manager.updateAppWidget(appWidgetId, views)
    }
}
