package expo.modules.iqamahcountdown

import android.annotation.SuppressLint
import android.app.AlarmManager
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.net.Uri
import android.os.Build
import androidx.core.app.NotificationCompat
import androidx.core.app.NotificationManagerCompat
import org.json.JSONArray
import org.json.JSONObject

data class Countdown(val at: Long, val iqamah: Long, val title: String, val body: String, val nowBody: String) {
  val notificationId get() = (iqamah / 60_000).toInt()
}

/** Fires the alarms: shows the countdown, swaps it to "now" at the iqamah, re-arms after a reboot or update. */
class CountdownReceiver : BroadcastReceiver() {
  override fun onReceive(context: Context, intent: Intent) {
    val saved = Countdowns.load(context)
    if (intent.action == Intent.ACTION_BOOT_COMPLETED || intent.action == Intent.ACTION_MY_PACKAGE_REPLACED) {
      saved.forEach { Countdowns.arm(context, it) }
      return
    }
    val countdown = saved.find { it.iqamah == intent.data?.lastPathSegment?.toLongOrNull() } ?: return
    if (intent.action == Countdowns.SHOW) Countdowns.post(context, countdown, System.currentTimeMillis() >= countdown.iqamah)
    // Swapping in "now" only touches a countdown still on screen, so a dismissed one stays gone.
    if (intent.action == Countdowns.NOW && Countdowns.isShowing(context, countdown)) Countdowns.post(context, countdown, true)
  }
}

object Countdowns {
  const val SHOW = "expo.modules.iqamahcountdown.SHOW"
  const val NOW = "expo.modules.iqamahcountdown.NOW"
  // Created from JS (src/features/reminders/notifications.ts), which owns the channel's settings.
  private const val CHANNEL = "iqamah-silent"
  private const val PREFS = "iqamah-countdown"

  /** Cancels the previous alarms and arms these; saved so a reboot can re-arm them. */
  fun replace(context: Context, next: List<Countdown>) {
    val keep = next.map { it.iqamah }.toSet()
    for (old in load(context)) {
      cancel(context, old)
      // A countdown on screen for a prayer no longer reminded would never reach "now": clear it.
      if (old.iqamah !in keep) NotificationManagerCompat.from(context).cancel(old.notificationId)
    }
    save(context, next)
    next.forEach { arm(context, it) }
  }

  fun arm(context: Context, countdown: Countdown) {
    val now = System.currentTimeMillis()
    if (countdown.at > now) alarm(context, countdown.at, pending(context, SHOW, countdown))
    if (countdown.iqamah > now && countdown.iqamah > countdown.at) alarm(context, countdown.iqamah, pending(context, NOW, countdown))
  }

  @SuppressLint("MissingPermission")
  fun post(context: Context, countdown: Countdown, reached: Boolean) {
    val manager = NotificationManagerCompat.from(context)
    if (!manager.areNotificationsEnabled()) return
    val open = context.packageManager.getLaunchIntentForPackage(context.packageName)?.let {
      PendingIntent.getActivity(context, 0, it, PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT)
    }
    val builder = NotificationCompat.Builder(context, CHANNEL)
      .setSmallIcon(context.applicationInfo.icon)
      .setContentTitle(countdown.title)
      .setContentText(if (reached) countdown.nowBody else countdown.body)
      .setCategory(NotificationCompat.CATEGORY_REMINDER)
      .setPriority(NotificationCompat.PRIORITY_HIGH)
      .setContentIntent(open)
      .setAutoCancel(true)
      // The swap to "now" updates the notification in place without buzzing again.
      .setOnlyAlertOnce(true)
      .setWhen(countdown.iqamah)
      .setShowWhen(true)
    // Android ticks the countdown itself; past zero it would run negative, hence the NOW alarm.
    if (!reached) builder.setUsesChronometer(true).setChronometerCountDown(true)
    manager.notify(countdown.notificationId, builder.build())
  }

  fun isShowing(context: Context, countdown: Countdown) =
    context.getSystemService(NotificationManager::class.java).activeNotifications.any { it.id == countdown.notificationId }

  fun load(context: Context): List<Countdown> {
    val json = JSONArray(prefs(context).getString("countdowns", "[]"))
    return (0 until json.length()).map { i ->
      val o = json.getJSONObject(i)
      Countdown(o.getLong("at"), o.getLong("iqamah"), o.getString("title"), o.getString("body"), o.getString("nowBody"))
    }
  }

  private fun save(context: Context, countdowns: List<Countdown>) {
    val json = JSONArray(countdowns.map {
      JSONObject().put("at", it.at).put("iqamah", it.iqamah).put("title", it.title).put("body", it.body).put("nowBody", it.nowBody)
    })
    prefs(context).edit().putString("countdowns", json.toString()).apply()
  }

  private fun prefs(context: Context) = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE)

  private fun cancel(context: Context, countdown: Countdown) {
    val alarms = context.getSystemService(AlarmManager::class.java)
    alarms.cancel(pending(context, SHOW, countdown))
    alarms.cancel(pending(context, NOW, countdown))
  }

  // PendingIntents match on action + data, so the same countdown always maps to the same alarm.
  private fun pending(context: Context, action: String, countdown: Countdown): PendingIntent {
    val intent = Intent(context, CountdownReceiver::class.java)
      .setAction(action)
      .setData(Uri.parse("iqamah-countdown://alarm/${countdown.iqamah}"))
    return PendingIntent.getBroadcast(context, 0, intent, PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT)
  }

  private fun alarm(context: Context, at: Long, operation: PendingIntent) {
    val alarms = context.getSystemService(AlarmManager::class.java)
    if (Build.VERSION.SDK_INT < Build.VERSION_CODES.S || alarms.canScheduleExactAlarms()) {
      alarms.setExactAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, at, operation)
      return
    }
    alarms.setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, at, operation)
  }
}
