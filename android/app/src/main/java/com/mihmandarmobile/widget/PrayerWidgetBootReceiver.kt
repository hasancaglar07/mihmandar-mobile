package com.mihmandarmobile.widget

import android.appwidget.AppWidgetManager
import android.content.BroadcastReceiver
import android.content.ComponentName
import android.content.Context
import android.content.Intent

class PrayerWidgetBootReceiver : BroadcastReceiver() {
    override fun onReceive(context: Context, intent: Intent) {
        val mgr = AppWidgetManager.getInstance(context)
        val cn = ComponentName(context, PrayerWidgetProvider::class.java)
        val ids = mgr.getAppWidgetIds(cn)
        if (ids != null && ids.isNotEmpty()) {
            // Boot sonrası zorunlu güncelleme tetikle
            mgr.notifyAppWidgetViewDataChanged(ids, com.mihmandarmobile.R.id.tvNext)
        }
    }
}



