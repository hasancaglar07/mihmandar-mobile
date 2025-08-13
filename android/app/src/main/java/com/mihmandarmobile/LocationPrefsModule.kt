package com.mihmandarmobile

import android.content.Context
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod

class LocationPrefsModule(private val appContext: ReactApplicationContext) : ReactContextBaseJavaModule(appContext) {
  override fun getName() = "LocationPrefs"

  private fun prayerPrefs() = appContext.getSharedPreferences("prayer_prefs", Context.MODE_PRIVATE)
  private fun locationPrefs() = appContext.getSharedPreferences("location_prefs", Context.MODE_PRIVATE)
  private fun appLocationPrefs() = appContext.getSharedPreferences("app_location", Context.MODE_PRIVATE)

  @ReactMethod
  fun saveCoordinates(lat: Double, lng: Double, promise: Promise) {
    try {
      // Save for widget direct access
      prayerPrefs().edit()
        .putString("lat", lat.toString())
        .putString("lng", lng.toString())
        .apply()

      // Save for legacy/location fallback
      locationPrefs().edit()
        .putString("lat", lat.toString())
        .putString("lng", lng.toString())
        .apply()

      // Save for app cached location
      appLocationPrefs().edit()
        .putString("current_lat", lat.toString())
        .putString("current_lng", lng.toString())
        .apply()
      promise.resolve(true)
    } catch (e: Exception) {
      promise.reject("ERR_SAVE", e)
    }
  }

  @ReactMethod
  fun getCoordinates(promise: Promise) {
    val p = prayerPrefs()
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


