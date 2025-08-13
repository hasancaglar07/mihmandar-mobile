import WidgetKit
import SwiftUI
import Intents

struct Provider: IntentTimelineProvider {
    func placeholder(in context: Context) -> SimpleEntry {
        SimpleEntry(date: Date(), 
                   nextPrayer: "Öğle", 
                   nextTime: "12:45", 
                   remainingMinutes: 120,
                   hijriDate: "15 Rabiulevvel 1446",
                   allPrayerTimes: [
                       "İmsak": "05:30",
                       "Güneş": "07:15",
                       "Öğle": "12:45",
                       "İkindi": "15:30",
                       "Akşam": "18:15",
                       "Yatsı": "19:45"
                   ])
    }

    func getSnapshot(for configuration: ConfigurationIntent, in context: Context, completion: @escaping (SimpleEntry) -> ()) {
        let entry = SimpleEntry(date: Date(), 
                               nextPrayer: "Öğle", 
                               nextTime: "12:45", 
                               remainingMinutes: 120,
                               hijriDate: "15 Rabiulevvel 1446",
                               allPrayerTimes: [
                                   "İmsak": "05:30",
                                   "Güneş": "07:15",
                                   "Öğle": "12:45",
                                   "İkindi": "15:30",
                                   "Akşam": "18:15",
                                   "Yatsı": "19:45"
                               ])
        completion(entry)
    }

    func getTimeline(for configuration: ConfigurationIntent, in context: Context, completion: @escaping (Timeline<Entry>) -> ()) {
        var entries: [SimpleEntry] = []

        // Generate timeline entries for the next hour
        let currentDate = Date()
        for hourOffset in 0 ..< 5 {
            let entryDate = Calendar.current.date(byAdding: .hour, value: hourOffset, to: currentDate)!
            
            // In a real app, fetch prayer times from your API
            let entry = fetchPrayerTimes(for: entryDate)
            entries.append(entry)
        }

        let timeline = Timeline(entries: entries, policy: .atEnd)
        completion(timeline)
    }
    
    private func fetchPrayerTimes(for date: Date) -> SimpleEntry {
        // This would normally fetch from your API
        // For now, return placeholder data
        let hijriFormatter = DateFormatter()
        hijriFormatter.calendar = Calendar(identifier: .islamicUmmAlQura)
        hijriFormatter.dateStyle = .long
        hijriFormatter.locale = Locale(identifier: "tr_TR")
        
        return SimpleEntry(
            date: date,
            nextPrayer: "Öğle",
            nextTime: "12:45",
            remainingMinutes: 120,
            hijriDate: "15 Rabiulevvel 1446",
            allPrayerTimes: [
                "İmsak": "05:30",
                "Güneş": "07:15",
                "Öğle": "12:45",
                "İkindi": "15:30",
                "Akşam": "18:15",
                "Yatsı": "19:45"
            ]
        )
    }
}

struct SimpleEntry: TimelineEntry {
    let date: Date
    let nextPrayer: String
    let nextTime: String
    let remainingMinutes: Int
    let hijriDate: String
    let allPrayerTimes: [String: String]
}

struct PrayerTimesWidgetEntryView : View {
    var entry: Provider.Entry
    @Environment(\.widgetFamily) var family

    var body: some View {
        switch family {
        case .systemSmall:
            SmallWidgetView(entry: entry)
        case .systemMedium:
            MediumWidgetView(entry: entry)
        case .systemLarge:
            LargeWidgetView(entry: entry)
        default:
            SmallWidgetView(entry: entry)
        }
    }
}

// Small Widget (Compact)
struct SmallWidgetView: View {
    let entry: SimpleEntry
    
    var body: some View {
        VStack(alignment: .leading, spacing: 4) {
            HStack {
                Text("🕌")
                    .font(.title2)
                Spacer()
                Circle()
                    .fill(Color.green)
                    .frame(width: 6, height: 6)
            }
            
            Spacer()
            
            VStack(alignment: .leading, spacing: 2) {
                Text("Sıradaki: \(entry.nextPrayer)")
                    .font(.caption)
                    .foregroundColor(.secondary)
                
                Text(entry.nextTime)
                    .font(.title2)
                    .fontWeight(.bold)
                    .foregroundColor(.primary)
                
                let hours = entry.remainingMinutes / 60
                let minutes = entry.remainingMinutes % 60
                let remainingText = hours > 0 ? "\(hours)s \(minutes)dk" : "\(minutes) dk"
                
                Text(remainingText)
                    .font(.caption2)
                    .foregroundColor(.secondary)
            }
            
            Spacer()
        }
        .padding()
        .background(
            LinearGradient(
                gradient: Gradient(colors: [Color(.systemBackground), Color(.systemGray6)]),
                startPoint: .topLeading,
                endPoint: .bottomTrailing
            )
        )
    }
}

// Medium Widget
struct MediumWidgetView: View {
    let entry: SimpleEntry
    
    var body: some View {
        VStack(spacing: 12) {
            // Header
            HStack {
                Image(systemName: "bell.fill")
                    .foregroundColor(.green)
                Text("Namaz Vakitleri")
                    .font(.headline)
                    .foregroundColor(.primary)
                Spacer()
                Text(DateFormatter.shortDate.string(from: entry.date))
                    .font(.caption)
                    .foregroundColor(.secondary)
            }
            
            // Next Prayer Highlight
            HStack {
                VStack(alignment: .leading) {
                    Text("Sıradaki: \(entry.nextPrayer)")
                        .font(.subheadline)
                        .foregroundColor(.white)
                    Text(entry.nextTime)
                        .font(.title)
                        .fontWeight(.bold)
                        .foregroundColor(.white)
                }
                Spacer()
                let hours = entry.remainingMinutes / 60
                let minutes = entry.remainingMinutes % 60
                let remainingText = hours > 0 ? "\(hours)s \(minutes)dk" : "\(minutes) dk"
                Text(remainingText)
                    .font(.subheadline)
                    .foregroundColor(.white)
            }
            .padding()
            .background(
                LinearGradient(
                    gradient: Gradient(colors: [Color.green, Color.blue]),
                    startPoint: .leading,
                    endPoint: .trailing
                )
            )
            .cornerRadius(12)
            
            // Hijri Date
            HStack {
                Text("🌙 \(entry.hijriDate)")
                    .font(.caption)
                    .foregroundColor(.orange)
                Spacer()
            }
        }
        .padding()
        .background(Color(.systemBackground))
    }
}

// Large Widget
struct LargeWidgetView: View {
    let entry: SimpleEntry
    
    var body: some View {
        VStack(spacing: 16) {
            // Header
            HStack {
                Image(systemName: "bell.fill")
                    .foregroundColor(.green)
                Text("Namaz Vakitleri")
                    .font(.headline)
                    .foregroundColor(.primary)
                Spacer()
                Text(DateFormatter.shortDate.string(from: entry.date))
                    .font(.caption)
                    .foregroundColor(.secondary)
            }
            
            // Next Prayer Highlight
            HStack {
                VStack(alignment: .leading) {
                    Text("Sıradaki: \(entry.nextPrayer)")
                        .font(.subheadline)
                        .foregroundColor(.white)
                    Text(entry.nextTime)
                        .font(.title)
                        .fontWeight(.bold)
                        .foregroundColor(.white)
                }
                Spacer()
                let hours = entry.remainingMinutes / 60
                let minutes = entry.remainingMinutes % 60
                let remainingText = hours > 0 ? "\(hours)s \(minutes)dk" : "\(minutes) dk"
                VStack {
                    Text("Kalan Süre")
                        .font(.caption)
                        .foregroundColor(.white.opacity(0.8))
                    Text(remainingText)
                        .font(.title2)
                        .fontWeight(.semibold)
                        .foregroundColor(.white)
                }
            }
            .padding()
            .background(
                LinearGradient(
                    gradient: Gradient(colors: [Color.green, Color.blue]),
                    startPoint: .leading,
                    endPoint: .trailing
                )
            )
            .cornerRadius(12)
            
            // All Prayer Times Grid
            LazyVGrid(columns: Array(repeating: GridItem(.flexible()), count: 3), spacing: 8) {
                ForEach(["İmsak", "Güneş", "Öğle", "İkindi", "Akşam", "Yatsı"], id: \.self) { prayer in
                    VStack(spacing: 4) {
                        Text(prayer)
                            .font(.caption)
                            .foregroundColor(.secondary)
                        Text(entry.allPrayerTimes[prayer] ?? "--:--")
                            .font(.subheadline)
                            .fontWeight(.semibold)
                            .foregroundColor(.primary)
                    }
                    .padding(8)
                    .background(Color(.systemGray6))
                    .cornerRadius(8)
                }
            }
            
            // Hijri Date
            Text("🌙 \(entry.hijriDate)")
                .font(.caption)
                .foregroundColor(.orange)
        }
        .padding()
        .background(Color(.systemBackground))
    }
}

@main
struct PrayerTimesWidget: Widget {
    let kind: String = "PrayerTimesWidget"

    var body: some WidgetConfiguration {
        IntentConfiguration(kind: kind, intent: ConfigurationIntent.self, provider: Provider()) { entry in
            PrayerTimesWidgetEntryView(entry: entry)
        }
        .configurationDisplayName("Namaz Vakitleri")
        .description("Namaz vakitlerini ve bir sonraki namaza kalan süreyi gösterir.")
        .supportedFamilies([.systemSmall, .systemMedium, .systemLarge])
    }
}

extension DateFormatter {
    static let shortDate: DateFormatter = {
        let formatter = DateFormatter()
        formatter.dateStyle = .short
        formatter.locale = Locale(identifier: "tr_TR")
        return formatter
    }()
}

struct PrayerTimesWidget_Previews: PreviewProvider {
    static var previews: some View {
        PrayerTimesWidgetEntryView(entry: SimpleEntry(
            date: Date(),
            nextPrayer: "Öğle",
            nextTime: "12:45",
            remainingMinutes: 120,
            hijriDate: "15 Rabiulevvel 1446",
            allPrayerTimes: [
                "İmsak": "05:30",
                "Güneş": "07:15",
                "Öğle": "12:45",
                "İkindi": "15:30",
                "Akşam": "18:15",
                "Yatsı": "19:45"
            ]
        ))
        .previewContext(WidgetPreviewContext(family: .systemSmall))
        
        PrayerTimesWidgetEntryView(entry: SimpleEntry(
            date: Date(),
            nextPrayer: "Öğle",
            nextTime: "12:45",
            remainingMinutes: 120,
            hijriDate: "15 Rabiulevvel 1446",
            allPrayerTimes: [
                "İmsak": "05:30",
                "Güneş": "07:15",
                "Öğle": "12:45",
                "İkindi": "15:30",
                "Akşam": "18:15",
                "Yatsı": "19:45"
            ]
        ))
        .previewContext(WidgetPreviewContext(family: .systemMedium))
    }
}
