package com.mihmandarmobile

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import com.mihmandarmobile.widget.WidgetScheduler

/** Initializes periodic sync on boot/package replaced (manifest already listens in BootReceiver) */
class PrayerAppInitializer : BroadcastReceiver() {
  override fun onReceive(context: Context, intent: Intent) {
    // Ensure periodic sync is scheduled (daily)
    WidgetScheduler.scheduleDailySync(context.applicationContext)
  }
}






