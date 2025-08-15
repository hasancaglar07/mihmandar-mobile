package com.mihmandarmobile

import android.app.PendingIntent
import android.appwidget.AppWidgetManager
import android.appwidget.AppWidgetProvider
import android.content.Context
import android.content.Intent
import android.widget.RemoteViews
import android.graphics.Color
import android.text.format.DateFormat
import java.util.*
import java.text.SimpleDateFormat
import org.json.JSONObject

class PrayerWidgetProvider : AppWidgetProvider() {

    override fun onUpdate(
        context: Context,
        appWidgetManager: AppWidgetManager,
        appWidgetIds: IntArray
    ) {
        for (appWidgetId in appWidgetIds) {
            updateAppWidget(context, appWidgetManager, appWidgetId)
        }
    }

    override fun onEnabled(context: Context) {
        // Widget ilk kez eklendiğinde çağrılır
    }

    override fun onDisabled(context: Context) {
        // Son widget kaldırıldığında çağrılır
    }

    companion object {
        fun updateAppWidget(
            context: Context,
            appWidgetManager: AppWidgetManager,
            appWidgetId: Int
        ) {
            // SharedPreferences'tan widget verilerini al
            val prefs = context.getSharedPreferences("widget_data", Context.MODE_PRIVATE)
            val widgetDataJson = prefs.getString("prayer_times", "{}")
            
            try {
                val widgetData = JSONObject(widgetDataJson ?: "{}")
                val views = RemoteViews(context.packageName, R.layout.prayer_widget)
                
                // Tema ayarlarını al
                val themeData = prefs.getString("widget_theme", "{}")
                val theme = JSONObject(themeData ?: "{}")
                
                // Sıradaki namaz bilgisi
                val nextPrayer = widgetData.optJSONObject("nextPrayer")
                if (nextPrayer != null) {
                    val prayerName = nextPrayer.optString("name", "Öğle")
                    val prayerTime = nextPrayer.optString("time", "13:00")
                    val remainingMinutes = nextPrayer.optInt("remainingMinutes", 0)
                    
                    views.setTextViewText(R.id.next_prayer_name, "Sıradaki: $prayerName")
                    views.setTextViewText(R.id.next_prayer_time, prayerTime)
                    views.setTextViewText(R.id.remaining_time, formatRemainingTime(remainingMinutes))
                }
                
                // Tüm namaz vakitleri
                val allPrayerTimes = widgetData.optJSONObject("allPrayerTimes")
                if (allPrayerTimes != null) {
                    // İmsak
                    views.setTextViewText(R.id.imsak_time, allPrayerTimes.optString("imsak", "--:--"))
                    views.setImageViewResource(R.id.imsak_icon, R.drawable.ic_moon)
                    
                    // Güneş
                    views.setTextViewText(R.id.gunes_time, allPrayerTimes.optString("gunes", "--:--"))
                    views.setImageViewResource(R.id.gunes_icon, R.drawable.ic_sun)
                    
                    // Öğle
                    views.setTextViewText(R.id.ogle_time, allPrayerTimes.optString("ogle", "--:--"))
                    views.setImageViewResource(R.id.ogle_icon, R.drawable.ic_sun_high)
                    
                    // İkindi
                    views.setTextViewText(R.id.ikindi_time, allPrayerTimes.optString("ikindi", "--:--"))
                    views.setImageViewResource(R.id.ikindi_icon, R.drawable.ic_sun_low)
                    
                    // Akşam
                    views.setTextViewText(R.id.aksam_time, allPrayerTimes.optString("aksam", "--:--"))
                    views.setImageViewResource(R.id.aksam_icon, R.drawable.ic_sunset)
                    
                    // Yatsı
                    views.setTextViewText(R.id.yatsi_time, allPrayerTimes.optString("yatsi", "--:--"))
                    views.setImageViewResource(R.id.yatsi_icon, R.drawable.ic_night)
                }
                
                // Konum bilgisi
                val location = widgetData.optString("location", "Konum Bilinmiyor")
                views.setTextViewText(R.id.location_text, location)
                
                // Hijri tarih
                val hijriDate = widgetData.optString("hijriDate", "")
                if (hijriDate.isNotEmpty()) {
                    views.setTextViewText(R.id.hijri_date, hijriDate)
                }
                
                // Tema renklerini uygula
                applyTheme(views, theme)
                
                // Mevcut vakti vurgula
                highlightCurrentPrayer(views, nextPrayer?.optString("name", ""))
                
                // Widget'a tıklandığında uygulamayı aç
                val intent = Intent(context, MainActivity::class.java)
                val pendingIntent = PendingIntent.getActivity(
                    context, 0, intent,
                    PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
                )
                views.setOnClickPendingIntent(R.id.widget_container, pendingIntent)
                
                // Widget'ı güncelle
                appWidgetManager.updateAppWidget(appWidgetId, views)
                
            } catch (e: Exception) {
                // Hata durumunda varsayılan widget göster
                showDefaultWidget(context, appWidgetManager, appWidgetId)
            }
        }
        
        private fun formatRemainingTime(minutes: Int): String {
            if (minutes <= 0) return "Vakit girdi"
            
            val hours = minutes / 60
            val mins = minutes % 60
            
            return when {
                hours > 0 -> "${hours}s ${mins}dk"
                else -> "${mins}dk"
            }
        }
        
        private fun applyTheme(views: RemoteViews, theme: JSONObject) {
            try {
                val backgroundColor = theme.optString("background", "#ffffff")
                val primaryColor = theme.optString("primaryColor", "#177267")
                val textColor = theme.optString("textColor", "#1f2937")
                val accentColor = theme.optString("accentColor", "#ffc574")
                
                // Arka plan rengini ayarla (gradient değilse)
                if (!backgroundColor.startsWith("linear-gradient")) {
                    try {
                        views.setInt(R.id.widget_container, "setBackgroundColor", Color.parseColor(backgroundColor))
                    } catch (e: Exception) {
                        // Renk parse hatası - varsayılan kullan
                    }
                }
                
                // Ana metin renklerini ayarla
                try {
                    views.setTextColor(R.id.next_prayer_name, Color.parseColor(primaryColor))
                    views.setTextColor(R.id.next_prayer_time, Color.parseColor(primaryColor))
                    views.setTextColor(R.id.location_text, Color.parseColor(textColor))
                    views.setTextColor(R.id.hijri_date, Color.parseColor(textColor))
                    views.setTextColor(R.id.remaining_time, Color.parseColor(accentColor))
                } catch (e: Exception) {
                    // Renk parse hatası
                }
                
                // Vakit metinlerinin renklerini ayarla
                try {
                    val timeTextColor = Color.parseColor(textColor)
                    views.setTextColor(R.id.imsak_time, timeTextColor)
                    views.setTextColor(R.id.gunes_time, timeTextColor)
                    views.setTextColor(R.id.ogle_time, timeTextColor)
                    views.setTextColor(R.id.ikindi_time, timeTextColor)
                    views.setTextColor(R.id.aksam_time, timeTextColor)
                    views.setTextColor(R.id.yatsi_time, timeTextColor)
                } catch (e: Exception) {
                    // Renk parse hatası
                }
                
                // Icon tint renklerini ayarla
                try {
                    val iconColor = Color.parseColor(accentColor)
                    views.setInt(R.id.imsak_icon, "setColorFilter", iconColor)
                    views.setInt(R.id.gunes_icon, "setColorFilter", iconColor)
                    views.setInt(R.id.ogle_icon, "setColorFilter", iconColor)
                    views.setInt(R.id.ikindi_icon, "setColorFilter", iconColor)
                    views.setInt(R.id.aksam_icon, "setColorFilter", iconColor)
                    views.setInt(R.id.yatsi_icon, "setColorFilter", iconColor)
                } catch (e: Exception) {
                    // Icon renk hatası
                }
                
            } catch (e: Exception) {
                // Genel tema uygulama hatası - varsayılan renkler kullanılır
            }
        }
        
        private fun highlightCurrentPrayer(views: RemoteViews, currentPrayerName: String?) {
            // Önce tüm vakitleri normal renge çevir
            val normalColor = Color.parseColor("#1f2937")
            val highlightColor = Color.parseColor("#177267")
            
            views.setTextColor(R.id.imsak_time, normalColor)
            views.setTextColor(R.id.gunes_time, normalColor)
            views.setTextColor(R.id.ogle_time, normalColor)
            views.setTextColor(R.id.ikindi_time, normalColor)
            views.setTextColor(R.id.aksam_time, normalColor)
            views.setTextColor(R.id.yatsi_time, normalColor)
            
            // Mevcut vakti vurgula
            when (currentPrayerName?.lowercase()) {
                "imsak", "İmsak" -> views.setTextColor(R.id.imsak_time, highlightColor)
                "gunes", "güneş" -> views.setTextColor(R.id.gunes_time, highlightColor)
                "ogle", "öğle" -> views.setTextColor(R.id.ogle_time, highlightColor)
                "ikindi", "İkindi" -> views.setTextColor(R.id.ikindi_time, highlightColor)
                "aksam", "akşam" -> views.setTextColor(R.id.aksam_time, highlightColor)
                "yatsi", "yatsı" -> views.setTextColor(R.id.yatsi_time, highlightColor)
            }
        }
        
        private fun showDefaultWidget(
            context: Context,
            appWidgetManager: AppWidgetManager,
            appWidgetId: Int
        ) {
            val views = RemoteViews(context.packageName, R.layout.prayer_widget)
            
            views.setTextViewText(R.id.next_prayer_name, "Sıradaki: Öğle")
            views.setTextViewText(R.id.next_prayer_time, "13:00")
            views.setTextViewText(R.id.remaining_time, "Yükleniyor...")
            views.setTextViewText(R.id.location_text, "Mihmandar")
            
            // Varsayılan vakitler
            views.setTextViewText(R.id.imsak_time, "05:30")
            views.setTextViewText(R.id.gunes_time, "07:00")
            views.setTextViewText(R.id.ogle_time, "13:00")
            views.setTextViewText(R.id.ikindi_time, "16:30")
            views.setTextViewText(R.id.aksam_time, "19:00")
            views.setTextViewText(R.id.yatsi_time, "20:30")
            
            appWidgetManager.updateAppWidget(appWidgetId, views)
        }
    }
}