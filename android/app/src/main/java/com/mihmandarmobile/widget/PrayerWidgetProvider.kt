package com.mihmandarmobile.widget

import android.app.PendingIntent
import android.appwidget.AppWidgetManager
import android.appwidget.AppWidgetProvider
import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.net.Uri
import android.widget.RemoteViews
import kotlinx.coroutines.*
import java.net.URL
import org.json.JSONObject

class PrayerWidgetProvider : AppWidgetProvider() {

    override fun onUpdate(context: Context, appWidgetManager: AppWidgetManager, appWidgetIds: IntArray) {
        for (appWidgetId in appWidgetIds) {
            updateWidget(context, appWidgetManager, appWidgetId)
        }
    }

    override fun onReceive(context: Context, intent: Intent) {
        super.onReceive(context, intent)
        if (intent.action == AppWidgetManager.ACTION_APPWIDGET_UPDATE) {
            val mgr = AppWidgetManager.getInstance(context)
            val cn = ComponentName(context, PrayerWidgetProvider::class.java)
            onUpdate(context, mgr, mgr.getAppWidgetIds(cn))
        }
    }

    private fun updateWidget(context: Context, manager: AppWidgetManager, appWidgetId: Int) {
        val views = RemoteViews(context.packageName, com.mihmandarmobile.R.layout.prayer_widget_layout)

        // Basit: localStorage yerine SharedPreferences ile kaydedilmiş koordinatları kullanın
        val prefs = context.getSharedPreferences("prayer_prefs", Context.MODE_PRIVATE)
        val lat = prefs.getString("lat", null)
        val lng = prefs.getString("lng", null)

        views.setTextViewText(com.mihmandarmobile.R.id.tvNext, "Sıradaki")
        views.setTextViewText(com.mihmandarmobile.R.id.tvTime, "yükleniyor…")
        manager.updateAppWidget(appWidgetId, views)

        GlobalScope.launch(Dispatchers.IO) {
            try {
                val tzOffset = java.util.TimeZone.getDefault().rawOffset / 60000
                val base = "https://vakit.vercel.app/api/timesForGPS?lat=${lat}&lng=${lng}&date=" +
                        java.time.LocalDate.now().toString() + "&days=1&timezoneOffset=${tzOffset}&calculationMethod=Turkey&lang=tr"
                val text = URL(base).readText()
                val obj = JSONObject(text)
                val timesObj = obj.optJSONObject("times")
                var imsak: String? = null; var gunes: String? = null; var ogle: String? = null; var ikindi: String? = null; var aksam: String? = null; var yatsi: String? = null
                if (timesObj != null) {
                    val dateKey = timesObj.keys().asSequence().firstOrNull()
                    val arr = timesObj.getJSONArray(dateKey)
                    imsak = arr.getString(0); gunes = arr.getString(1); ogle = arr.getString(2); ikindi = arr.getString(3); aksam = arr.getString(4); yatsi = arr.getString(5)
                } else {
                    val arr = obj.optJSONArray("times")
                    if (arr != null && arr.length() > 0) {
                        val first = arr.getJSONObject(0)
                        imsak = first.optString("fajr"); gunes = first.optString("sunrise"); ogle = first.optString("dhuhr"); ikindi = first.optString("asr"); aksam = first.optString("maghrib"); yatsi = first.optString("isha")
                    }
                }
                val map = listOf(
                    "İmsak" to imsak, "Güneş" to gunes, "Öğle" to ogle, "İkindi" to ikindi, "Akşam" to aksam, "Yatsı" to yatsi
                )
                val now = java.util.Calendar.getInstance()
                var nextName = "-"; var nextTime = "--:--"; var remainMin = 0
                for ((name, t) in map) {
                    if (t == null) continue
                    val parts = t.split(":"); if (parts.size < 2) continue
                    val cal = now.clone() as java.util.Calendar
                    cal.set(java.util.Calendar.HOUR_OF_DAY, parts[0].toInt())
                    cal.set(java.util.Calendar.MINUTE, parts[1].toInt())
                    cal.set(java.util.Calendar.SECOND, 0)
                    if (cal.timeInMillis >= now.timeInMillis) {
                        nextName = name; nextTime = t
                        remainMin = ((cal.timeInMillis - now.timeInMillis) / 60000).toInt()
                        break
                    }
                }
                withContext(Dispatchers.Main) {
                    views.setTextViewText(com.mihmandarmobile.R.id.tvNext, "Sıradaki: $nextName")
                    views.setTextViewText(com.mihmandarmobile.R.id.tvTime, "$nextTime (≈ $remainMin dk)")
                    manager.updateAppWidget(appWidgetId, views)
                }
            } catch (e: Exception) {
                withContext(Dispatchers.Main) {
                    views.setTextViewText(com.mihmandarmobile.R.id.tvNext, "Sıradaki")
                    views.setTextViewText(com.mihmandarmobile.R.id.tvTime, "hata")
                    manager.updateAppWidget(appWidgetId, views)
                }
            }
        }
    }
}



