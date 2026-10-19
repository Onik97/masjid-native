package expo.modules.iqamahcountdown

import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import expo.modules.kotlin.records.Field
import expo.modules.kotlin.records.Record

class CountdownRecord : Record {
  @Field var at: Double = 0.0
  @Field var iqamah: Double = 0.0
  @Field var title: String = ""
  @Field var body: String = ""
  @Field var nowBody: String = ""
}

class IqamahCountdownModule : Module() {
  override fun definition() = ModuleDefinition {
    Name("IqamahCountdown")

    Function("replace") { reminders: List<CountdownRecord> ->
      val context = appContext.reactContext ?: return@Function
      Countdowns.replace(
        context,
        reminders.map { Countdown(it.at.toLong(), it.iqamah.toLong(), it.title, it.body, it.nowBody) },
      )
    }
  }
}
