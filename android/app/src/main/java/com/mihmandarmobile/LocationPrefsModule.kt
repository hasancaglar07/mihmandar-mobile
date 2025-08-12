package com.mihmandarmobile

import android.content.Context
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod

class LocationPrefsModule(private val appContext: ReactApplicationContext) : ReactContextBaseJavaModule(appContext) {
  override fun getName() = "LocationPrefs"

  private fun prefs() = appContext.getSharedPreferences("prayer_prefs", Context.MODE_PRIVATE)

  @ReactMethod
  fun saveCoordinates(lat: Double, lng: Double, promise: Promise) {
    try {
      prefs().edit().putString("lat", lat.toString()).putString("lng", lng.toString()).apply()
      promise.resolve(true)
    } catch (e: Exception) {
      promise.reject("ERR_SAVE", e)
    }
  }

  @ReactMethod
  fun getCoordinates(promise: Promise) {
    val p = prefs()
    val lat = p.getString("lat", null)
    val lng = p.getString("lng", null)
    if (lat != null && lng != null) {
      val map = com.facebook.react.bridge.Arguments.createMap()
      map.putString("lat", lat)
      map.putString("lng", lng)
      promise.resolve(map)
    } else {
      promise.resolve(null)
    }
  }
}


