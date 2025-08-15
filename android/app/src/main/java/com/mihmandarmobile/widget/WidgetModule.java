package com.mihmandarmobile.widget;

import android.appwidget.AppWidgetManager;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;

import com.facebook.react.bridge.Promise;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReactContextBaseJavaModule;
import com.facebook.react.bridge.ReactMethod;
import com.facebook.react.bridge.WritableMap;
import com.facebook.react.bridge.Arguments;

public class WidgetModule extends ReactContextBaseJavaModule {
    
    private static final String PREFS_NAME = "prayer_prefs";
    private final ReactApplicationContext reactContext;

    public WidgetModule(ReactApplicationContext reactContext) {
        super(reactContext);
        this.reactContext = reactContext;
    }

    @Override
    public String getName() {
        return "WidgetModule";
    }

    @ReactMethod
    public void saveCoordinates(double latitude, double longitude, Promise promise) {
        try {
            Context context = getReactApplicationContext();
            SharedPreferences prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
            SharedPreferences.Editor editor = prefs.edit();
            
            editor.putString("lat", String.valueOf(latitude));
            editor.putString("lng", String.valueOf(longitude));
            editor.putLong("coordinates_updated", System.currentTimeMillis());
            editor.apply();
            
            // Trigger widget update
            forceWidgetUpdate(context);
            
            promise.resolve(true);
        } catch (Exception e) {
            promise.reject("SAVE_COORDINATES_ERROR", e.getMessage());
        }
    }

    @ReactMethod
    public void updateWidgetData(String jsonData, Promise promise) {
        try {
            Context context = getReactApplicationContext();
            SharedPreferences prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
            SharedPreferences.Editor editor = prefs.edit();
            
            editor.putString("widget_data", jsonData);
            editor.putLong("data_updated", System.currentTimeMillis());
            editor.apply();
            
            // Trigger widget update
            forceWidgetUpdate(context);
            
            promise.resolve(true);
        } catch (Exception e) {
            promise.reject("UPDATE_WIDGET_DATA_ERROR", e.getMessage());
        }
    }

    @ReactMethod
    public void updateTheme(String themeJson, Promise promise) {
        try {
            Context context = getReactApplicationContext();
            SharedPreferences prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
            SharedPreferences.Editor editor = prefs.edit();
            
            editor.putString("theme", themeJson);
            editor.apply();
            
            // Trigger widget update
            forceWidgetUpdate(context);
            // Update all providers too
            AppWidgetManager am = AppWidgetManager.getInstance(context);
            Intent i2 = new Intent(context, PrayerWidgetCompactProvider.class);
            i2.setAction(AppWidgetManager.ACTION_APPWIDGET_UPDATE);
            int[] ids2 = am.getAppWidgetIds(new ComponentName(context, PrayerWidgetCompactProvider.class));
            if (ids2.length > 0) { i2.putExtra(AppWidgetManager.EXTRA_APPWIDGET_IDS, ids2); context.sendBroadcast(i2); }
            Intent i3 = new Intent(context, PrayerWidgetFullProvider.class);
            i3.setAction(AppWidgetManager.ACTION_APPWIDGET_UPDATE);
            int[] ids3 = am.getAppWidgetIds(new ComponentName(context, PrayerWidgetFullProvider.class));
            if (ids3.length > 0) { i3.putExtra(AppWidgetManager.EXTRA_APPWIDGET_IDS, ids3); context.sendBroadcast(i3); }
            
            promise.resolve(true);
        } catch (Exception e) {
            promise.reject("UPDATE_THEME_ERROR", e.getMessage());
        }
    }

    @ReactMethod
    public void forceRefresh(Promise promise) {
        try {
            Context context = getReactApplicationContext();
            forceWidgetUpdate(context);
            promise.resolve(true);
        } catch (Exception e) {
            promise.reject("FORCE_REFRESH_ERROR", e.getMessage());
        }
    }

    @ReactMethod
    public void forceRefreshAll(Promise promise) {
        try {
            Context context = getReactApplicationContext();
            AppWidgetManager am = AppWidgetManager.getInstance(context);
            // Standard
            Intent i1 = new Intent(context, PrayerWidgetProvider.class);
            i1.setAction(AppWidgetManager.ACTION_APPWIDGET_UPDATE);
            int[] ids1 = am.getAppWidgetIds(new ComponentName(context, PrayerWidgetProvider.class));
            if (ids1.length > 0) { i1.putExtra(AppWidgetManager.EXTRA_APPWIDGET_IDS, ids1); context.sendBroadcast(i1); }
            // Compact
            Intent i2 = new Intent(context, PrayerWidgetCompactProvider.class);
            i2.setAction(AppWidgetManager.ACTION_APPWIDGET_UPDATE);
            int[] ids2 = am.getAppWidgetIds(new ComponentName(context, PrayerWidgetCompactProvider.class));
            if (ids2.length > 0) { i2.putExtra(AppWidgetManager.EXTRA_APPWIDGET_IDS, ids2); context.sendBroadcast(i2); }
            // Full
            Intent i3 = new Intent(context, PrayerWidgetFullProvider.class);
            i3.setAction(AppWidgetManager.ACTION_APPWIDGET_UPDATE);
            int[] ids3 = am.getAppWidgetIds(new ComponentName(context, PrayerWidgetFullProvider.class));
            if (ids3.length > 0) { i3.putExtra(AppWidgetManager.EXTRA_APPWIDGET_IDS, ids3); context.sendBroadcast(i3); }
            promise.resolve(true);
        } catch (Exception e) {
            promise.reject("FORCE_REFRESH_ALL_ERROR", e.getMessage());
        }
    }

    @ReactMethod
    public void isWidgetActive(Promise promise) {
        try {
            Context context = getReactApplicationContext();
            AppWidgetManager appWidgetManager = AppWidgetManager.getInstance(context);
            ComponentName widgetComponent = new ComponentName(context, PrayerWidgetProvider.class);
            int[] widgetIds = appWidgetManager.getAppWidgetIds(widgetComponent);
            
            boolean isActive = widgetIds.length > 0;
            promise.resolve(isActive);
        } catch (Exception e) {
            promise.resolve(false);
        }
    }

    @ReactMethod
    public void getWidgetInfo(Promise promise) {
        try {
            Context context = getReactApplicationContext();
            SharedPreferences prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
            
            WritableMap info = Arguments.createMap();
            info.putBoolean("hasCoordinates", 
                prefs.getString("lat", null) != null && 
                prefs.getString("lng", null) != null);
            info.putDouble("lastUpdate", prefs.getLong("data_updated", 0));
            info.putString("theme", prefs.getString("theme", null));
            
            // Check if widget is active
            AppWidgetManager appWidgetManager = AppWidgetManager.getInstance(context);
            ComponentName widgetComponent = new ComponentName(context, PrayerWidgetProvider.class);
            int[] widgetIds = appWidgetManager.getAppWidgetIds(widgetComponent);
            info.putBoolean("isActive", widgetIds.length > 0);
            info.putInt("widgetCount", widgetIds.length);
            
            promise.resolve(info);
        } catch (Exception e) {
            promise.reject("GET_WIDGET_INFO_ERROR", e.getMessage());
        }
    }

    @ReactMethod
    public void clearWidgetData(Promise promise) {
        try {
            Context context = getReactApplicationContext();
            SharedPreferences prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
            SharedPreferences.Editor editor = prefs.edit();
            
            editor.clear();
            editor.apply();
            
            promise.resolve(true);
        } catch (Exception e) {
            promise.reject("CLEAR_WIDGET_DATA_ERROR", e.getMessage());
        }
    }

    private void forceWidgetUpdate(Context context) {
        Intent intent = new Intent(context, PrayerWidgetProvider.class);
        intent.setAction(AppWidgetManager.ACTION_APPWIDGET_UPDATE);
        
        AppWidgetManager appWidgetManager = AppWidgetManager.getInstance(context);
        ComponentName widgetComponent = new ComponentName(context, PrayerWidgetProvider.class);
        int[] widgetIds = appWidgetManager.getAppWidgetIds(widgetComponent);
        
        if (widgetIds.length > 0) {
            intent.putExtra(AppWidgetManager.EXTRA_APPWIDGET_IDS, widgetIds);
            context.sendBroadcast(intent);
        }
    }
}
