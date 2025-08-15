package com.mihmandarmobile.widget

import android.appwidget.AppWidgetManager
import android.content.BroadcastReceiver
import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.util.Log

class PrayerWidgetBootReceiver : BroadcastReceiver() {

    override fun onReceive(context: Context, intent: Intent) {
        when (intent.action) {
            Intent.ACTION_BOOT_COMPLETED,
            Intent.ACTION_MY_PACKAGE_REPLACED -> {
                Log.d("WidgetBootReceiver", "📱 Device booted or app updated, refreshing widgets")
                refreshAllWidgets(context)
            }
        }
    }

    private fun refreshAllWidgets(context: Context) {
        try {
            val appWidgetManager = AppWidgetManager.getInstance(context)
            
            // Refresh all widget providers
            val providers = listOf(
                ComponentName(context, PrayerWidgetProvider::class.java),
                ComponentName(context, PrayerWidgetCompactProvider::class.java),
                ComponentName(context, PrayerWidgetFullProvider::class.java)
            )

            providers.forEach { provider ->
                val widgetIds = appWidgetManager.getAppWidgetIds(provider)
                if (widgetIds.isNotEmpty()) {
                    val updateIntent = Intent(context, provider.className.let { Class.forName(it) })
                    updateIntent.action = AppWidgetManager.ACTION_APPWIDGET_UPDATE
                    updateIntent.putExtra(AppWidgetManager.EXTRA_APPWIDGET_IDS, widgetIds)
                    context.sendBroadcast(updateIntent)
                    
                    Log.d("WidgetBootReceiver", "✅ Refreshed ${widgetIds.size} widgets for ${provider.className}")
                }
            }
        } catch (e: Exception) {
            Log.e("WidgetBootReceiver", "❌ Error refreshing widgets on boot", e)
        }
    }
}
