package com.mihmandarmobile

import android.app.Activity
import android.content.Intent
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.ReadableMap

class IntentLauncherModule(private val appContext: ReactApplicationContext) : ReactContextBaseJavaModule(appContext) {
  override fun getName() = "IntentLauncher"

  @ReactMethod
  fun startActivity(activityName: String, extras: ReadableMap?) {
    val ctx: Activity = appContext.currentActivity ?: return
    try {
      val clazz = Class.forName(activityName)
      val intent = Intent(ctx, clazz)
      extras?.let {
        if (it.hasKey("url")) intent.putExtra("url", it.getString("url"))
        if (it.hasKey("title")) intent.putExtra("title", it.getString("title"))
      }
      ctx.startActivity(intent)
    } catch (_: Throwable) {}
  }
}


