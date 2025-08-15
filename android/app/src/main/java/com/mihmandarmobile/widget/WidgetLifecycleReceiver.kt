package com.mihmandarmobile.widget

import android.appwidget.AppWidgetManager
import android.content.BroadcastReceiver
import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.util.Log

/**
 * Listens to system lifecycle signals (timezone/date/user present/network changes)
 * and requests a soft refresh for all widget providers.
 */
class WidgetLifecycleReceiver : BroadcastReceiver() {

  override fun onReceive(context: Context, intent: Intent) {
    try {
      Log.d("WidgetLifecycle", "Signal received: ${intent.action}")
      refreshAllWidgets(context)
    } catch (e: Exception) {
      Log.e("WidgetLifecycle", "Error handling lifecycle signal", e)
    }
  }

  private fun refreshAllWidgets(context: Context) {
    val appWidgetManager = AppWidgetManager.getInstance(context)
    val providers = listOf(
      ComponentName(context, PrayerWidgetProvider::class.java),
      ComponentName(context, PrayerWidgetCompactProvider::class.java),
      ComponentName(context, PrayerWidgetFullProvider::class.java)
    )
    providers.forEach { provider ->
      val ids = appWidgetManager.getAppWidgetIds(provider)
      if (ids.isNotEmpty()) {
        val update = Intent(context, Class.forName(provider.className))
        update.action = AppWidgetManager.ACTION_APPWIDGET_UPDATE
        update.putExtra(AppWidgetManager.EXTRA_APPWIDGET_IDS, ids)
        context.sendBroadcast(update)
      }
    }
  }
}









