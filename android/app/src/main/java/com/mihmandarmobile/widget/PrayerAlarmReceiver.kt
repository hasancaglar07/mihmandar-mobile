package com.mihmandarmobile.widget

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.os.Build
import androidx.core.app.NotificationCompat
import android.media.AudioAttributes
import android.media.AudioFocusRequest
import android.media.AudioManager
import android.media.MediaPlayer
import android.net.Uri
import android.appwidget.AppWidgetManager
import android.content.ComponentName
import android.os.Handler
import android.os.Looper
import com.mihmandarmobile.MainActivity
import com.mihmandarmobile.R

class PrayerAlarmReceiver : BroadcastReceiver() {

    companion object {
        private const val CHANNEL_ID = "prayer_alarms"
        private const val CHANNEL_NAME = "Namaz Vakti Alarmları"
        private var ezanPlayer: MediaPlayer? = null
        private var audioManager: AudioManager? = null
        private var audioFocusRequest: AudioFocusRequest? = null
    }

    override fun onReceive(context: Context, intent: Intent) {
        val action = intent.action
        val prayerName = intent.getStringExtra("prayerName") ?: "Namaz"
        val isPre = intent.getBooleanExtra("isPre", false)
        val enableEzan = intent.getBooleanExtra("enableEzan", false)

        when (action) {
            "PRAYER_PRE_ALARM" -> {
                showPreAlarmNotification(context, prayerName)
            }
            "PRAYER_ALARM" -> {
                if (enableEzan) {
                    playEzan(context, prayerName)
                }
                showPrayerAlarmNotification(context, prayerName, enableEzan)
            }
            "PRAYER_STOP" -> {
                stopEzan()
            }
            "PRAYER_SNOOZE" -> {
                stopEzan()
                val snoozeMinutes = intent.getIntExtra("minutes", 5)
                // Schedule snooze alarm here if needed
            }
        }

        // Soft refresh widgets after any alarm to advance next prayer display
        try {
            val mgr = AppWidgetManager.getInstance(context)
            val cn = ComponentName(context, PrayerWidgetProvider::class.java)
            val ids = mgr.getAppWidgetIds(cn)
            if (ids != null && ids.isNotEmpty()) {
                val refreshIntent = Intent(context, PrayerWidgetProvider::class.java).setAction(PrayerWidgetProvider.ACTION_REFRESH)
                context.sendBroadcast(refreshIntent)
            }
        } catch (_: Exception) {}
    }

    private fun showPreAlarmNotification(context: Context, prayerName: String) {
        createNotificationChannel(context)
        
        val notificationManager = context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
        
        val mainIntent = Intent(context, MainActivity::class.java).apply {
            addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TASK)
        }
        val pendingIntent = PendingIntent.getActivity(
            context, 0, mainIntent, 
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )

        val notification = NotificationCompat.Builder(context, CHANNEL_ID)
            .setSmallIcon(R.mipmap.ic_launcher)
            .setContentTitle("⏰ Namaz Vakti Yaklaşıyor")
            .setContentText("$prayerName vaktine az kaldı")
            .setPriority(NotificationCompat.PRIORITY_HIGH)
            .setContentIntent(pendingIntent)
            .setAutoCancel(true)
            .setVibrate(longArrayOf(0, 500, 250, 500))
            .build()

        notificationManager.notify(prayerName.hashCode(), notification)
    }

    private fun showPrayerAlarmNotification(context: Context, prayerName: String, enableEzan: Boolean) {
        createNotificationChannel(context)
        
        val notificationManager = context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
        
        val mainIntent = Intent(context, MainActivity::class.java).apply {
            addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TASK)
        }
        val pendingIntent = PendingIntent.getActivity(
            context, 0, mainIntent, 
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )

        val icon = when (prayerName) {
            "İmsak" -> "🌙"
            "Güneş" -> "🌅"
            "Öğle" -> "☀️"
            "İkindi" -> "🌆"
            "Akşam" -> "🌇"
            "Yatsı" -> "🌃"
            else -> "🕌"
        }

        val title = if (enableEzan) "🔊 $icon Ezan - $prayerName" else "🕌 $icon $prayerName Vakti"
        val message = if (enableEzan) "$prayerName vakti girdi - Ezan okunuyor" else "$prayerName vakti girdi"

        val notification = NotificationCompat.Builder(context, CHANNEL_ID)
            .setSmallIcon(R.mipmap.ic_launcher)
            .setContentTitle(title)
            .setContentText(message)
            .setPriority(NotificationCompat.PRIORITY_MAX)
            .setContentIntent(pendingIntent)
            .setAutoCancel(true)
            .setVibrate(longArrayOf(0, 1000, 500, 1000, 500, 1000))
            .setSound(android.provider.Settings.System.DEFAULT_NOTIFICATION_URI)
            .addAction(0, "Durdur", PendingIntent.getBroadcast(context, 3001, Intent("PRAYER_STOP").apply { putExtra("prayerName", prayerName) }, PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE))
            .addAction(0, "Ertele 5dk", PendingIntent.getBroadcast(context, 3002, Intent("PRAYER_SNOOZE").apply { putExtra("prayerName", prayerName); putExtra("minutes", 5) }, PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE))
            .build()

        notificationManager.notify(prayerName.hashCode() + 1000, notification)
    }

    private fun createNotificationChannel(context: Context) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val channel = NotificationChannel(
                CHANNEL_ID,
                CHANNEL_NAME,
                NotificationManager.IMPORTANCE_HIGH
            ).apply {
                description = "Namaz vakti alarm bildirimleri"
                enableVibration(true)
                vibrationPattern = longArrayOf(0, 1000, 500, 1000)
            }

            val notificationManager = context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
            notificationManager.createNotificationChannel(channel)
        }
    }

    private fun playEzan(context: Context, prayerName: String) {
        try {
            stopEzan() // Stop any currently playing ezan
            
            audioManager = context.getSystemService(Context.AUDIO_SERVICE) as AudioManager
            
            // Request audio focus
            val audioAttributes = AudioAttributes.Builder()
                .setUsage(AudioAttributes.USAGE_ALARM)
                .setContentType(AudioAttributes.CONTENT_TYPE_MUSIC)
                .build()
            
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                audioFocusRequest = AudioFocusRequest.Builder(AudioManager.AUDIOFOCUS_GAIN)
                    .setAudioAttributes(audioAttributes)
                    .setAcceptsDelayedFocusGain(true)
                    .setOnAudioFocusChangeListener { focusChange ->
                        when (focusChange) {
                            AudioManager.AUDIOFOCUS_LOSS,
                            AudioManager.AUDIOFOCUS_LOSS_TRANSIENT -> stopEzan()
                        }
                    }
                    .build()
                audioManager?.requestAudioFocus(audioFocusRequest!!)
            }
            
            // Get ezan settings from SharedPreferences
            val prefs = context.getSharedPreferences("prayer_prefs", Context.MODE_PRIVATE)
            val settingsJson = prefs.getString("settings", null)
            var ezanType = "traditional"
            try {
                if (settingsJson != null) {
                    val s = org.json.JSONObject(settingsJson)
                    ezanType = s.optString("ezanType", "traditional")
                }
            } catch (_: Exception) {}
            
            // Get ezan file based on type
            val ezanResourceId = when (ezanType) {
                "modern" -> R.raw.ezan_modern
                "chime" -> R.raw.ezan_chime
                "builtin" -> R.raw.ezan_builtin
                else -> R.raw.ezan_traditional
            }
            
            val ezanUri = Uri.parse("android.resource://" + context.packageName + "/" + ezanResourceId)
            
            ezanPlayer = MediaPlayer().apply {
                setDataSource(context, ezanUri)
                setAudioAttributes(audioAttributes)
                isLooping = false
                setOnCompletionListener {
                    stopEzan()
                }
                setOnErrorListener { _, _, _ ->
                    stopEzan()
                    true
                }
                prepareAsync()
                setOnPreparedListener {
                    start()
                    // Auto-stop after 3 minutes
                    Handler(Looper.getMainLooper()).postDelayed({
                        stopEzan()
                    }, 180000) // 3 minutes
                }
            }
        } catch (e: Exception) {
            e.printStackTrace()
            stopEzan()
        }
    }
    
    private fun stopEzan() {
        try {
            ezanPlayer?.let {
                if (it.isPlaying) {
                    it.stop()
                }
                it.release()
            }
            ezanPlayer = null
            
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                audioFocusRequest?.let { request ->
                    audioManager?.abandonAudioFocusRequest(request)
                }
            }
            audioFocusRequest = null
            audioManager = null
        } catch (e: Exception) {
            e.printStackTrace()
        }
    }
}

