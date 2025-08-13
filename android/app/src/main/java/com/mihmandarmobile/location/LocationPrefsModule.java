package com.mihmandarmobile.location;

import android.content.Context;
import android.content.SharedPreferences;

import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReactContextBaseJavaModule;
import com.facebook.react.bridge.ReactMethod;
import com.facebook.react.bridge.Promise;

public class LocationPrefsModule extends ReactContextBaseJavaModule {
    
    private static final String MODULE_NAME = "LocationPrefs";
    
    public LocationPrefsModule(ReactApplicationContext reactContext) {
        super(reactContext);
    }
    
    @Override
    public String getName() {
        return MODULE_NAME;
    }
    
    @ReactMethod
    public void saveCoordinates(double lat, double lng, Promise promise) {
        try {
            // Save to multiple SharedPreferences for widget access
            Context context = getReactApplicationContext();
            
            // Save to location_prefs
            SharedPreferences locationPrefs = context.getSharedPreferences("location_prefs", Context.MODE_PRIVATE);
            locationPrefs.edit()
                .putString("lat", String.valueOf(lat))
                .putString("lng", String.valueOf(lng))
                .apply();
                
            // Save to app_location for widget fallback
            SharedPreferences appLocationPrefs = context.getSharedPreferences("app_location", Context.MODE_PRIVATE);
            appLocationPrefs.edit()
                .putString("current_lat", String.valueOf(lat))
                .putString("current_lng", String.valueOf(lng))
                .apply();
                
            // Save to prayer_prefs for direct widget access
            SharedPreferences prayerPrefs = context.getSharedPreferences("prayer_prefs", Context.MODE_PRIVATE);
            prayerPrefs.edit()
                .putString("lat", String.valueOf(lat))
                .putString("lng", String.valueOf(lng))
                .apply();
                
            promise.resolve(true);
        } catch (Exception e) {
            promise.reject("LOCATION_SAVE_ERROR", "Failed to save coordinates", e);
        }
    }
    
    @ReactMethod
    public void getCoordinates(Promise promise) {
        try {
            Context context = getReactApplicationContext();
            SharedPreferences prefs = context.getSharedPreferences("location_prefs", Context.MODE_PRIVATE);
            
            String lat = prefs.getString("lat", null);
            String lng = prefs.getString("lng", null);
            
            if (lat != null && lng != null) {
                promise.resolve("lat: " + lat + ", lng: " + lng);
            } else {
                promise.resolve("No coordinates found");
            }
        } catch (Exception e) {
            promise.reject("LOCATION_GET_ERROR", "Failed to get coordinates", e);
        }
    }
}
