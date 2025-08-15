package com.mihmandarmobile.widget

import android.app.PendingIntent
import android.appwidget.AppWidgetManager
import android.app.AlarmManager
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

        // If RN snapshot exists, prefer it to ensure tight app ↔ widget control and read settings
        val snapshot = prefs.getString("widget_data", null)
        if (snapshot != null) {
             try {
                val json = JSONObject(snapshot)
                // Persist settings snapshot if provided
                if (json.has("settings")) {
                    prefs.edit().putString("settings", json.getJSONObject("settings").toString()).apply()
                }
                val next = json.optJSONObject("nextPrayer")
                val name = next?.optString("name", "") ?: ""
                val time = next?.optString("time", "--:--") ?: "--:--"
                val remaining = next?.optInt("remainingMinutes", 0) ?: 0
                val timesObj = json.optJSONObject("allPrayerTimes")
                val map = mutableMapOf<String, String>()
                if (timesObj != null) {
                    val keys = listOf("imsak","gunes","ogle","ikindi","aksam","yatsi")
                    for (k in keys) {
                        val label = when (k) {"imsak"->"İmsak";"gunes"->"Güneş";"ogle"->"Öğle";"ikindi"->"İkindi";"aksam"->"Akşam";"yatsi"->"Yatsı"; else -> k }
                        map[label] = timesObj.optString(k, "--:--")
                    }
                }
                 updateWidgetWithPrayerData(views, manager, appWidgetId, Triple(name, time, remaining), map)
                 scheduleAllAlarms(context, map)
                 scheduleMinuteRefresh(context, computeTargetMillis(time))
                return
            } catch (_: Exception) { /* fallback to API */ }
        }

        // Fetch prayer times asynchronously (fallback)
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
        try {
            if (themeData != null && themeData.isNotEmpty()) {
                val theme = JSONObject(themeData)
                val background = theme.optString("background", "#ffffff")
                val primaryColor = theme.optString("primaryColor", "#177267")
                val textColor = theme.optString("textColor", "#1f2937")
                val accentColor = theme.optString("accentColor", "#ffc574")
                
                // Note: Background color cannot be changed dynamically in widgets
                // Widget background is set in XML layout
                if (isValidColor(textColor)) {
                    views.setTextColor(com.mihmandarmobile.R.id.tvNext, Color.parseColor(textColor))
                    views.setTextColor(com.mihmandarmobile.R.id.tvLastUpdate, Color.parseColor(textColor))
                }
                if (isValidColor(primaryColor)) {
                    views.setTextColor(com.mihmandarmobile.R.id.tvTime, Color.parseColor(primaryColor))
                }
                if (isValidColor(accentColor)) {
                    views.setTextColor(com.mihmandarmobile.R.id.tvRemaining, Color.parseColor(accentColor))
                    views.setTextColor(com.mihmandarmobile.R.id.tvHijriDate, Color.parseColor(accentColor))
                }
                
                Log.d("WidgetTheme", "✅ Theme applied: bg=$background, primary=$primaryColor, text=$textColor, accent=$accentColor")
            } else {
                // Apply default theme
                applyDefaultTheme(views)
            }
        } catch (e: Exception) {
            Log.e("WidgetTheme", "❌ Error applying theme: ${e.message}")
            applyDefaultTheme(views)
        }
    }
    
    private fun isValidColor(colorString: String): Boolean {
        return try {
            colorString.startsWith("#") && (colorString.length == 7 || colorString.length == 9)
        } catch (e: Exception) {
            false
        }
    }
    
    private fun applyDefaultTheme(views: RemoteViews) {
        try {
            // Apply default text colors (background is set in XML)
            views.setTextColor(com.mihmandarmobile.R.id.tvNext, Color.parseColor("#1f2937"))
            views.setTextColor(com.mihmandarmobile.R.id.tvTime, Color.parseColor("#177267"))
            views.setTextColor(com.mihmandarmobile.R.id.tvRemaining, Color.parseColor("#ffc574"))
            views.setTextColor(com.mihmandarmobile.R.id.tvLastUpdate, Color.parseColor("#1f2937"))
            views.setTextColor(com.mihmandarmobile.R.id.tvHijriDate, Color.parseColor("#ffc574"))
        } catch (e: Exception) {
            Log.e("WidgetTheme", "❌ Error applying default theme: ${e.message}")
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
                // Use vakit.vercel.app API directly like web does
                // Use DST-aware timezone offset in minutes, matching web's (-Date.getTimezoneOffset())
                val tzOffset = -(TimeZone.getDefault().getOffset(System.currentTimeMillis()) / 60000)
                val today = SimpleDateFormat("yyyy-MM-dd", Locale.getDefault()).format(Date())
                val apiUrl = "https://vakit.vercel.app/api/timesForGPS?lat=$lat&lng=$lng&date=$today&days=1&timezoneOffset=$tzOffset&calculationMethod=Turkey&lang=tr"
                
                Log.d("WidgetAPI", "📡 Fetching from: $apiUrl")
                
                val connection = URL(apiUrl).openConnection() as java.net.HttpURLConnection
                connection.requestMethod = "GET"
                connection.connectTimeout = 10000
                connection.readTimeout = 10000
                connection.setRequestProperty("Accept", "application/json")
                connection.setRequestProperty("User-Agent", "MihmandarWidget/1.0")
                
                val responseCode = connection.responseCode
                Log.d("WidgetAPI", "Response code: $responseCode")
                
                if (responseCode != 200) {
                    throw Exception("API returned $responseCode")
                }
                
                val response = connection.inputStream.bufferedReader().use { it.readText() }
                Log.d("WidgetAPI", "Response length: ${response.length}")
                
                val json = JSONObject(response)
                val prayerTimes = parsePrayerTimes(json)
                
                if (prayerTimes.isEmpty()) {
                    throw Exception("No prayer times parsed from response")
                }
                
                val nextPrayer = findNextPrayer(prayerTimes)
                
                withContext(Dispatchers.Main) {
                    updateWidgetWithPrayerData(views, manager, appWidgetId, nextPrayer, prayerTimes)
                    scheduleMinuteRefresh(context, computeTargetMillis(nextPrayer.second))
                    scheduleAllAlarms(context, prayerTimes)
                    scheduleMidnightRefresh(context)
                }
                
                // Save last update time
                val prefs = context.getSharedPreferences("prayer_prefs", Context.MODE_PRIVATE)
                prefs.edit()
                    .putLong("last_update", System.currentTimeMillis())
                    .putString("last_times", response) // Cache the response
                    .apply()
                
                Log.d("WidgetUpdate", "✅ Widget updated successfully")
                
            } catch (e: Exception) {
                Log.e("WidgetUpdate", "❌ API fetch failed: ${e.message}", e)
                
                // Try to use cached data
                val prefs = context.getSharedPreferences("prayer_prefs", Context.MODE_PRIVATE)
                val cachedResponse = prefs.getString("last_times", null)
                
                if (cachedResponse != null) {
                    try {
                        val json = JSONObject(cachedResponse)
                        val prayerTimes = parsePrayerTimes(json)
                        val nextPrayer = findNextPrayer(prayerTimes)
                        
                        withContext(Dispatchers.Main) {
                            updateWidgetWithPrayerData(views, manager, appWidgetId, nextPrayer, prayerTimes)
                            views.setTextViewText(com.mihmandarmobile.R.id.tvLastUpdate, "⚠ (Önbellek)")
                            manager.updateAppWidget(appWidgetId, views)
                        }
                        
                        Log.d("WidgetUpdate", "📦 Using cached data")
                    } catch (cacheError: Exception) {
                        Log.e("WidgetUpdate", "Cache parse failed", cacheError)
                        withContext(Dispatchers.Main) {
                            showErrorState(views, manager, appWidgetId, "Bağlantı hatası")
                        }
                    }
                } else {
                    withContext(Dispatchers.Main) {
                        showErrorState(views, manager, appWidgetId, "Bağlantı hatası")
                    }
                }
            }
        }
    }

    private fun parsePrayerTimes(json: JSONObject): Map<String, String> {
        val times = mutableMapOf<String, String>()
        
        try {
            // Parse exactly like web does - vakit.vercel.app format
            // Structure: { times: { 'YYYY-MM-DD': [fajr,sunrise,dhuhr,asr,maghrib,isha] } }
            val timesObj = json.optJSONObject("times")
            if (timesObj != null && timesObj.length() > 0) {
                // Get the first date key
                val dateKey = timesObj.keys().next()
                Log.d("WidgetParser", "📅 Parsing date: $dateKey")
                
                val arr = timesObj.getJSONArray(dateKey)
                if (arr.length() >= 6) {
                    // Clean time strings (remove any extra text after space)
                    fun cleanTime(timeStr: String): String {
                        val cleaned = timeStr.split(" ")[0].trim()
                        // Validate format HH:MM
                        if (cleaned.matches(Regex("\\d{1,2}:\\d{2}"))) {
                            val parts = cleaned.split(":")
                            val hour = parts[0].toIntOrNull() ?: return ""
                            val minute = parts[1].toIntOrNull() ?: return ""
                            if (hour in 0..23 && minute in 0..59) {
                                return String.format("%02d:%02d", hour, minute)
                            }
                        }
                        return ""
                    }
                    
                    times["İmsak"] = cleanTime(arr.getString(0))
                    times["Güneş"] = cleanTime(arr.getString(1))
                    times["Öğle"] = cleanTime(arr.getString(2))
                    times["İkindi"] = cleanTime(arr.getString(3))
                    times["Akşam"] = cleanTime(arr.getString(4))
                    times["Yatsı"] = cleanTime(arr.getString(5))
                    
                    Log.d("WidgetParser", "✅ Parsed times: $times")
                    
                    // Remove any empty times
                    times.entries.removeAll { it.value.isEmpty() }
                    
                    if (times.isNotEmpty()) {
                        return times
                    }
                }
            }
            
            // Fallback: Try array format
            val arr = json.optJSONArray("times")
            if (arr != null && arr.length() > 0) {
                val first = arr.getJSONObject(0)
                
                fun getTime(obj: JSONObject, vararg keys: String): String {
                    for (key in keys) {
                        val value = obj.optString(key, "")
                        if (value.isNotEmpty()) {
                            val cleaned = value.split(" ")[0].trim()
                            if (cleaned.matches(Regex("\\d{1,2}:\\d{2}"))) {
                                return cleaned
                            }
                        }
                    }
                    return ""
                }
                
                times["İmsak"] = getTime(first, "fajr", "imsak", "Fajr", "Imsak")
                times["Güneş"] = getTime(first, "sunrise", "gunes", "Sunrise", "Gunes")
                times["Öğle"] = getTime(first, "dhuhr", "ogle", "Dhuhr", "Ogle")
                times["İkindi"] = getTime(first, "asr", "ikindi", "Asr", "Ikindi")
                times["Akşam"] = getTime(first, "maghrib", "aksam", "Maghrib", "Aksam")
                times["Yatsı"] = getTime(first, "isha", "yatsi", "Isha", "Yatsi")
                
                times.entries.removeAll { it.value.isEmpty() }
                
                Log.d("WidgetParser", "✅ Parsed array format: $times")
                return times
            }
        } catch (e: Exception) {
            Log.e("WidgetParser", "❌ Error parsing prayer times: ${e.message}", e)
        }
        
        Log.w("WidgetParser", "⚠️ No valid prayer times found in response")
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
        nextPrayer: Triple<String, String, Int>,
        allPrayerTimes: Map<String, String>
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

        views.setTextViewText(com.mihmandarmobile.R.id.tvPrayerIcon, icon)
        views.setTextViewText(com.mihmandarmobile.R.id.tvNext, "Sıradaki: $name")
        views.setTextViewText(com.mihmandarmobile.R.id.tvTime, time)

        val total = if (remainingMinutes < 0) 0 else remainingMinutes
        val hours = total / 60
        val mins = total % 60
        val remainingText = when {
            total <= 0 -> "⏱ Şimdi"
            hours > 0 -> "⏱ ${hours}s ${mins}dk kaldı"
            else -> "⏱ ${mins} dk kaldı"
        }
        views.setTextViewText(com.mihmandarmobile.R.id.tvRemaining, remainingText)

        views.setTextViewText(com.mihmandarmobile.R.id.tvLastUpdate, "●")
        updateMiniPrayerTimes(views, allPrayerTimes)
        manager.updateAppWidget(appWidgetId, views)
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
    try {
        val nextMinute = ((System.currentTimeMillis() / 60000) + 1) * 60000
        val intent = Intent(context, PrayerWidgetProvider::class.java).apply { action = ACTION_REFRESH }
        val pi = PendingIntent.getBroadcast(
            context, 2001, intent, PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )
        val am = context.getSystemService(Context.ALARM_SERVICE) as AlarmManager
        am.setExactAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, nextMinute, pi)
        // Re-schedule every minute
        am.setRepeating(
            AlarmManager.RTC_WAKEUP,
            nextMinute,
            60000, // 1 minute interval
            pi
        )
    } catch (e: Exception) {
        Log.e("Widget", "Schedule error", e)
    }
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
            val intent = Intent(context, PrayerWidgetProvider::class.java).apply { action = ACTION_REFRESH }
            val pi = PendingIntent.getBroadcast(
                context, 2301, intent, PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
            )
            val am = context.getSystemService(Context.ALARM_SERVICE) as AlarmManager
            am.setExactAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, cal.timeInMillis, pi)
        } catch (_: Exception) {}
    }

    private fun scheduleAllAlarms(context: Context, prayerTimes: Map<String, String>) {
        try {
            // Schedule alarms for all prayers of today/tomorrow according to current time
            val prefs = context.getSharedPreferences("prayer_prefs", Context.MODE_PRIVATE)
            val settingsJson = prefs.getString("settings", null)
            var preMin = 10
            var enableEzan = true
            var prayersFilter: JSONObject? = null
            try {
                if (settingsJson != null) {
                    val s = JSONObject(settingsJson)
                    preMin = s.optInt("preMinutes", 10)
                    enableEzan = s.optBoolean("enableEzan", true)
                    prayersFilter = if (s.has("prayers")) s.getJSONObject("prayers") else null
                }
            } catch (_: Exception) {}

            val order = listOf("İmsak","Güneş","Öğle","İkindi","Akşam","Yatsı")
            val alarmManager = context.getSystemService(Context.ALARM_SERVICE) as AlarmManager
            var req = 1200
            for (name in order) {
                val t = prayerTimes[name] ?: continue
                // prayers filter (keys expected: imsak,gunes,ogle,ikindi,aksam,yatsi)
                if (prayersFilter != null) {
                    val key = when (name) {
                        "İmsak" -> "imsak"
                        "Güneş" -> "gunes"
                        "Öğle" -> "ogle"
                        "İkindi" -> "ikindi"
                        "Akşam" -> "aksam"
                        "Yatsı" -> "yatsi"
                        else -> ""
                    }
                    if (key.isNotEmpty() && prayersFilter?.optBoolean(key, true) == false) {
                        continue
                    }
                }
                val parts = t.split(":")
                if (parts.size < 2) continue
                val target = Calendar.getInstance().apply {
                    set(Calendar.SECOND, 0)
                    set(Calendar.MILLISECOND, 0)
                    set(Calendar.HOUR_OF_DAY, parts[0].toInt())
                    set(Calendar.MINUTE, parts[1].toInt())
                }
                if (target.timeInMillis <= System.currentTimeMillis()) {
                    target.add(Calendar.DAY_OF_MONTH, 1)
                }

                val preIntent = Intent(context, PrayerAlarmReceiver::class.java).apply {
                    action = "PRAYER_PRE_ALARM"
                    putExtra("prayerName", name)
                    putExtra("isPre", true)
                }
                val prePi = PendingIntent.getBroadcast(context, req++, preIntent, PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE)
                val preTime = target.timeInMillis - preMin * 60 * 1000
                if (preTime > System.currentTimeMillis()) {
                    alarmManager.setExactAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, preTime, prePi)
                }

                val exactIntent = Intent(context, PrayerAlarmReceiver::class.java).apply {
                    action = "PRAYER_ALARM"
                    putExtra("prayerName", name)
                    putExtra("enableEzan", enableEzan)
                }
                val exactPi = PendingIntent.getBroadcast(context, req++, exactIntent, PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE)
                alarmManager.setExactAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, target.timeInMillis, exactPi)
            }
        } catch (_: Exception) {}
    }

    private fun updateMiniPrayerTimes(views: RemoteViews, prayerTimes: Map<String, String>) {
        try {
            fun setPair(nameId: Int, timeId: Int, key: String) {
                val t = prayerTimes[key] ?: "--:--"
                views.setTextViewText(nameId, key)
                views.setTextViewText(timeId, t)
            }

            setPair(com.mihmandarmobile.R.id.imsakName, com.mihmandarmobile.R.id.imsakTime, "İmsak")
            setPair(com.mihmandarmobile.R.id.gunesName, com.mihmandarmobile.R.id.gunesTime, "Güneş")
            setPair(com.mihmandarmobile.R.id.ogleName, com.mihmandarmobile.R.id.ogleTime, "Öğle")
            setPair(com.mihmandarmobile.R.id.ikindiName, com.mihmandarmobile.R.id.ikindiTime, "İkindi")
            setPair(com.mihmandarmobile.R.id.aksamName, com.mihmandarmobile.R.id.aksamTime, "Akşam")
            setPair(com.mihmandarmobile.R.id.yatsiName, com.mihmandarmobile.R.id.yatsiTime, "Yatsı")

            Log.d("WidgetUpdate", "Mini grid set: $prayerTimes")
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