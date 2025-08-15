package com.mihmandarmobile.widget

import android.appwidget.AppWidgetManager
import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.util.Log
import androidx.work.Worker
import androidx.work.WorkerParameters
import org.json.JSONObject
import java.net.HttpURLConnection
import java.net.URL
import java.text.SimpleDateFormat
import java.util.Calendar
import java.util.Date
import java.util.Locale
import java.util.TimeZone

class WidgetSyncWorker(appContext: Context, workerParams: WorkerParameters) : Worker(appContext, workerParams) {

  override fun doWork(): Result {
    val ctx = applicationContext
    try {
      val prefs = ctx.getSharedPreferences("prayer_prefs", Context.MODE_PRIVATE)
      val lat = prefs.getString("lat", null)
      val lng = prefs.getString("lng", null)

      if (lat != null && lng != null) {
        // Pull fresh times (best-effort)
        try {
          val tzOffset = TimeZone.getDefault().rawOffset / 60000
          val today = SimpleDateFormat("yyyy-MM-dd", Locale.getDefault()).format(Date())
          val apiUrl = "https://vakit.vercel.app/api/timesForGPS?lat=$lat&lng=$lng&date=$today&days=1&timezoneOffset=$tzOffset&calculationMethod=Turkey&lang=tr"
          val conn = URL(apiUrl).openConnection() as HttpURLConnection
          conn.requestMethod = "GET"
          conn.connectTimeout = 8000
          conn.readTimeout = 8000
          val code = conn.responseCode
          if (code == 200) {
            val response = conn.inputStream.bufferedReader().use { it.readText() }
            prefs.edit().putString("last_times", response).apply()
          }
        } catch (e: Exception) {
          Log.w("WidgetSyncWorker", "Network pull failed, using cache", e)
        }
      }

      // Broadcast update to all widget providers
      val appWidgetManager = AppWidgetManager.getInstance(ctx)
      val providers = listOf(
        ComponentName(ctx, PrayerWidgetProvider::class.java),
        ComponentName(ctx, PrayerWidgetCompactProvider::class.java),
        ComponentName(ctx, PrayerWidgetFullProvider::class.java)
      )
      providers.forEach { provider ->
        val ids = appWidgetManager.getAppWidgetIds(provider)
        if (ids.isNotEmpty()) {
          val i = Intent(ctx, Class.forName(provider.className))
          i.action = AppWidgetManager.ACTION_APPWIDGET_UPDATE
          i.putExtra(AppWidgetManager.EXTRA_APPWIDGET_IDS, ids)
          ctx.sendBroadcast(i)
        }
      }

      return Result.success()
    } catch (e: Exception) {
      Log.e("WidgetSyncWorker", "doWork error", e)
      return Result.retry()
    }
  }
}









