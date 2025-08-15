package com.mihmandarmobile.widget

import android.appwidget.AppWidgetManager
import android.content.ComponentName
import android.content.Context
import android.content.Intent
import androidx.work.CoroutineWorker
import androidx.work.WorkerParameters

class WidgetRefreshWorker(
    appContext: Context,
    workerParams: WorkerParameters
) : CoroutineWorker(appContext, workerParams) {

    override suspend fun doWork(): Result {
        return try {
            val context = applicationContext
            val am = AppWidgetManager.getInstance(context)
            // Broadcast update to all providers
            val providers = listOf(
                ComponentName(context, PrayerWidgetProvider::class.java),
                ComponentName(context, PrayerWidgetCompactProvider::class.java),
                ComponentName(context, PrayerWidgetFullProvider::class.java)
            )
            providers.forEach { cn ->
                val ids = am.getAppWidgetIds(cn)
                if (ids != null && ids.isNotEmpty()) {
                    val intent = Intent(context, Class.forName(cn.className)).apply {
                        action = AppWidgetManager.ACTION_APPWIDGET_UPDATE
                        putExtra(AppWidgetManager.EXTRA_APPWIDGET_IDS, ids)
                    }
                    context.sendBroadcast(intent)
                }
            }
            Result.success()
        } catch (_: Exception) {
            Result.retry()
        }
    }
}










