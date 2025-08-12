package com.mihmandarmobile

import com.facebook.react.ReactPackage
import com.facebook.react.bridge.NativeModule
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.uimanager.ViewManager

class LocationPrefsPackage : ReactPackage {
  override fun createNativeModules(reactContext: ReactApplicationContext): MutableList<NativeModule> =
    mutableListOf(LocationPrefsModule(reactContext))

  override fun createViewManagers(reactContext: ReactApplicationContext): MutableList<ViewManager<*, *>> =
    mutableListOf()
}


