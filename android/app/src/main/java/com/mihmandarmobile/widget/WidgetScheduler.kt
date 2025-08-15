package com.mihmandarmobile.widget

import android.content.Context
import androidx.work.ExistingPeriodicWorkPolicy
import androidx.work.PeriodicWorkRequestBuilder
import androidx.work.WorkManager
import androidx.work.Constraints
import androidx.work.NetworkType
import java.util.concurrent.TimeUnit

object WidgetScheduler {
  private const val WORK_TAG = "WidgetSyncPeriodic"

  fun scheduleDailySync(context: Context) {
    // 24 saatte bir çalışacak şekilde planla (sistem uygun gördüğü anda - Doze uyumlu)
    val constraints = Constraints.Builder().setRequiredNetworkType(NetworkType.CONNECTED).build()
    val req = PeriodicWorkRequestBuilder<WidgetSyncWorker>(24, TimeUnit.HOURS)
      .setConstraints(constraints)
      .addTag(WORK_TAG)
      .build()
    WorkManager.getInstance(context).enqueueUniquePeriodicWork(WORK_TAG, ExistingPeriodicWorkPolicy.UPDATE, req)
  }
}






