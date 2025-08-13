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

class PrayerWidgetFullProvider : AppWidgetProvider() {

    companion object {
        const val ACTION_WIDGET_CLICK = "com.mihmandarmobile.widget.full.WIDGET_CLICK"
        const val ACTION_REFRESH = "com.mihmandarmobile.widget.full.REFRESH"
    }

    override fun onUpdate(context: Context, appWidgetManager: AppWidgetManager, appWidgetIds: IntArray) {
        for (appWidgetId in appWidgetIds) {
            updateWidget(context, appWidgetManager, appWidgetId)
        }
    }

    override fun onReceive(context: Context, intent: Intent) {
        super.onReceive(context, intent)
        
        val mgr = AppWidgetManager.getInstance(context)
        val cn = ComponentName(context, PrayerWidgetFullProvider::class.java)
        
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
        val views = RemoteViews(context.packageName, com.mihmandarmobile.R.layout.prayer_widget_full)

        setupClickIntents(context, views, appWidgetId)

        val prefs = context.getSharedPreferences("prayer_prefs", Context.MODE_PRIVATE)
        val lat = prefs.getString("lat", null)
        val lng = prefs.getString("lng", null)
        val themeData = prefs.getString("theme", null)

        applyTheme(views, themeData)

        // Set date
        val today = SimpleDateFormat("d MMM", Locale("tr")).format(Date())
        views.setTextViewText(com.mihmandarmobile.R.id.tvDateFull, today)
        
        // Set loading state
        views.setTextViewText(com.mihmandarmobile.R.id.tvNextNameFull, "Yükleniyor...")
        views.setTextViewText(com.mihmandarmobile.R.id.tvNextTimeFull, "--:-- (...)")
        updateHijriDate(views)
        
        manager.updateAppWidget(appWidgetId, views)

        if (lat != null && lng != null) {
            fetchPrayerTimes(context, views, manager, appWidgetId, lat, lng)
        } else {
            showErrorState(views, manager, appWidgetId)
        }
    }

    private fun setupClickIntents(context: Context, views: RemoteViews, appWidgetId: Int) {
        val clickIntent = Intent(context, PrayerWidgetFullProvider::class.java).apply {
            action = ACTION_WIDGET_CLICK
        }
        val clickPendingIntent = PendingIntent.getBroadcast(
            context, appWidgetId, clickIntent, 
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )
        views.setOnClickPendingIntent(com.mihmandarmobile.R.id.tvNextNameFull, clickPendingIntent)
        views.setOnClickPendingIntent(com.mihmandarmobile.R.id.tvNextTimeFull, clickPendingIntent)
    }

    private fun applyTheme(views: RemoteViews, themeData: String?) {
        if (themeData != null) {
            try {
                val theme = JSONObject(themeData)
                val accentColor = android.graphics.Color.parseColor(theme.getString("accentColor"))
                views.setTextColor(com.mihmandarmobile.R.id.tvHijriDateFull, accentColor)
            } catch (e: Exception) {
                // Use default colors
            }
        }
    }

    private fun updateHijriDate(views: RemoteViews) {
        try {
            val hijriDate = getHijriDate()
            views.setTextViewText(com.mihmandarmobile.R.id.tvHijriDateFull, "🌙 $hijriDate")
        } catch (e: Exception) {
            views.setTextViewText(com.mihmandarmobile.R.id.tvHijriDateFull, "🌙 Hijri")
        }
    }

    private fun getHijriDate(): String {
        return try {
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
                    updateWidgetWithAllPrayerData(views, manager, appWidgetId, prayerTimes, nextPrayer)
                }
                
            } catch (e: Exception) {
                withContext(Dispatchers.Main) {
                    showErrorState(views, manager, appWidgetId)
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

    private fun updateWidgetWithAllPrayerData(
        views: RemoteViews, 
        manager: AppWidgetManager, 
        appWidgetId: Int,
        allPrayerTimes: Map<String, String>,
        nextPrayer: Triple<String, String, Int>
    ) {
        val (nextName, nextTime, remainingMinutes) = nextPrayer
        
        // Update next prayer highlight
        val nextIcon = when (nextName) {
            "İmsak" -> "🌙"
            "Güneş" -> "🌅" 
            "Öğle" -> "☀️"
            "İkindi" -> "🌆"
            "Akşam" -> "🌇"
            "Yatsı" -> "🌃"
            else -> "🕌"
        }
        
        views.setTextViewText(com.mihmandarmobile.R.id.tvNextIconFull, nextIcon)
        views.setTextViewText(com.mihmandarmobile.R.id.tvNextNameFull, "Sıradaki: $nextName")
        
        val remainingText = when {
            remainingMinutes >= 60 -> "${remainingMinutes / 60}s ${remainingMinutes % 60}dk"
            remainingMinutes > 0 -> "${remainingMinutes} dk"
            else -> "Şimdi"
        }
        views.setTextViewText(com.mihmandarmobile.R.id.tvNextTimeFull, "$nextTime ($remainingText)")
        
        // Update all individual prayer times
        try {
            // Update each prayer time item if they exist in the layout
            allPrayerTimes["İmsak"]?.let { time ->
                views.setTextViewText(com.mihmandarmobile.R.id.imsakItem + com.mihmandarmobile.R.id.tvPrayerTime, time)
                views.setTextViewText(com.mihmandarmobile.R.id.imsakItem + com.mihmandarmobile.R.id.tvPrayerName, "İmsak")
            }
            allPrayerTimes["Güneş"]?.let { time ->
                views.setTextViewText(com.mihmandarmobile.R.id.gunesItem + com.mihmandarmobile.R.id.tvPrayerTime, time)
                views.setTextViewText(com.mihmandarmobile.R.id.gunesItem + com.mihmandarmobile.R.id.tvPrayerName, "Güneş")
            }
            allPrayerTimes["Öğle"]?.let { time ->
                views.setTextViewText(com.mihmandarmobile.R.id.ogleItem + com.mihmandarmobile.R.id.tvPrayerTime, time)
                views.setTextViewText(com.mihmandarmobile.R.id.ogleItem + com.mihmandarmobile.R.id.tvPrayerName, "Öğle")
            }
            allPrayerTimes["İkindi"]?.let { time ->
                views.setTextViewText(com.mihmandarmobile.R.id.ikindiItem + com.mihmandarmobile.R.id.tvPrayerTime, time)
                views.setTextViewText(com.mihmandarmobile.R.id.ikindiItem + com.mihmandarmobile.R.id.tvPrayerName, "İkindi")
            }
            allPrayerTimes["Akşam"]?.let { time ->
                views.setTextViewText(com.mihmandarmobile.R.id.aksamItem + com.mihmandarmobile.R.id.tvPrayerTime, time)
                views.setTextViewText(com.mihmandarmobile.R.id.aksamItem + com.mihmandarmobile.R.id.tvPrayerName, "Akşam")
            }
            allPrayerTimes["Yatsı"]?.let { time ->
                views.setTextViewText(com.mihmandarmobile.R.id.yatsiItem + com.mihmandarmobile.R.id.tvPrayerTime, time)
                views.setTextViewText(com.mihmandarmobile.R.id.yatsiItem + com.mihmandarmobile.R.id.tvPrayerName, "Yatsı")
            }
        } catch (e: Exception) {
            // If individual prayer items don't exist, show a compact version
            e.printStackTrace()
        }
        
        manager.updateAppWidget(appWidgetId, views)
    }

    private fun showErrorState(views: RemoteViews, manager: AppWidgetManager, appWidgetId: Int) {
        views.setTextViewText(com.mihmandarmobile.R.id.tvNextNameFull, "Hata")
        views.setTextViewText(com.mihmandarmobile.R.id.tvNextTimeFull, "Veri alınamadı")
        manager.updateAppWidget(appWidgetId, views)
    }
}
