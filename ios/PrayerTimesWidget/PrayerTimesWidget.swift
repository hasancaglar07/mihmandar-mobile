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

        let nextUpdate = Calendar.current.date(byAdding: .second, value: min(60, remainingSeconds), to: currentDate)!
        TimelineEntry(date: .now, policy: .after(nextUpdate))
        completion(timeline)
    }
    
    private func fetchPrayerTimes(for date: Date) -> SimpleEntry {
        // Try to get cached data first
        if let cachedEntry = getCachedPrayerTimes() {
            return cachedEntry
        }
        
        // Fetch from API asynchronously
        fetchPrayerTimesFromAPI { entry in
            // Cache the result
            self.cachePrayerTimes(entry)
        }
        
        // Return placeholder data while loading
        let hijriFormatter = DateFormatter()
        hijriFormatter.calendar = Calendar(identifier: .islamicUmmAlQura)
        hijriFormatter.dateStyle = .long
        hijriFormatter.locale = Locale(identifier: "tr_TR")
        
        return SimpleEntry(
            date: date,
            nextPrayer: "Yükleniyor...",
            nextTime: "--:--",
            remainingMinutes: 0,
            hijriDate: hijriFormatter.string(from: date),
            allPrayerTimes: [
                "İmsak": "--:--",
                "Güneş": "--:--",
                "Öğle": "--:--",
                "İkindi": "--:--",
                "Akşam": "--:--",
                "Yatsı": "--:--"
            ]
        )
    }
    
    private func fetchPrayerTimesFromAPI(completion: @escaping (SimpleEntry) -> Void) {
        // Get stored coordinates from UserDefaults (shared with main app)
        let userDefaults = UserDefaults(suiteName: "group.com.mihmandarmobile.widget")
        guard let lat = userDefaults?.double(forKey: "latitude"),
              let lng = userDefaults?.double(forKey: "longitude"),
              lat != 0, lng != 0 else {
            return
        }
        
        let dateFormatter = DateFormatter()
        dateFormatter.dateFormat = "yyyy-MM-dd"
        let today = dateFormatter.string(from: Date())
        
        // Calculate timezone offset (matching Android implementation)
        let timeZone = TimeZone.current
        let offsetInMinutes = -(timeZone.secondsFromGMT() / 60)
        
        let urlString = "https://vakit.vercel.app/api/timesForGPS?lat=\(lat)&lng=\(lng)&date=\(today)&days=1&timezoneOffset=\(offsetInMinutes)&calculationMethod=Turkey&lang=tr"
        
        guard let url = URL(string: urlString) else { return }
        
        URLSession.shared.dataTask(with: url) { data, response, error in
            guard let data = data,
                  let json = try? JSONSerialization.jsonObject(with: data) as? [String: Any],
                  let times = json["times"] as? [String: Any] else {
                return
            }
            
            let entry = self.parsePrayerTimesResponse(times)
            DispatchQueue.main.async {
                completion(entry)
            }
        }.resume()
    }
    
    private func parsePrayerTimesResponse(_ times: [String: Any]) -> SimpleEntry {
        guard let firstDate = times.keys.first,
              let prayerArray = times[firstDate] as? [String] else {
            return getDefaultEntry()
        }
        
        let prayerTimes = [
            "İmsak": prayerArray.count > 0 ? cleanTime(prayerArray[0]) : "--:--",
            "Güneş": prayerArray.count > 1 ? cleanTime(prayerArray[1]) : "--:--",
            "Öğle": prayerArray.count > 2 ? cleanTime(prayerArray[2]) : "--:--",
            "İkindi": prayerArray.count > 3 ? cleanTime(prayerArray[3]) : "--:--",
            "Akşam": prayerArray.count > 4 ? cleanTime(prayerArray[4]) : "--:--",
            "Yatsı": prayerArray.count > 5 ? cleanTime(prayerArray[5]) : "--:--"
        ]
        
        let nextPrayer = findNextPrayer(from: prayerTimes)
        
        let hijriFormatter = DateFormatter()
        hijriFormatter.calendar = Calendar(identifier: .islamicUmmAlQura)
        hijriFormatter.dateStyle = .long
        hijriFormatter.locale = Locale(identifier: "tr_TR")
        
        return SimpleEntry(
            date: Date(),
            nextPrayer: nextPrayer.name,
            nextTime: nextPrayer.time,
            remainingMinutes: nextPrayer.remainingMinutes,
            hijriDate: hijriFormatter.string(from: Date()),
            allPrayerTimes: prayerTimes
        )
    }
    
    private func cleanTime(_ timeString: String) -> String {
        let cleaned = timeString.components(separatedBy: " ")[0].trimmingCharacters(in: .whitespaces)
        let regex = try? NSRegularExpression(pattern: "\\d{1,2}:\\d{2}")
        let range = NSRange(location: 0, length: cleaned.count)
        if regex?.firstMatch(in: cleaned, range: range) != nil {
            let components = cleaned.components(separatedBy: ":")
            if components.count == 2,
               let hour = Int(components[0]),
               let minute = Int(components[1]),
               hour >= 0 && hour <= 23 && minute >= 0 && minute <= 59 {
                return String(format: "%02d:%02d", hour, minute)
            }
        }
        return "--:--"
    }
    
    private func findNextPrayer(from prayerTimes: [String: String]) -> (name: String, time: String, remainingMinutes: Int) {
        let now = Date()
        let calendar = Calendar.current
        let prayers = [("İmsak", prayerTimes["İmsak"] ?? "--:--"),
                      ("Güneş", prayerTimes["Güneş"] ?? "--:--"),
                      ("Öğle", prayerTimes["Öğle"] ?? "--:--"),
                      ("İkindi", prayerTimes["İkindi"] ?? "--:--"),
                      ("Akşam", prayerTimes["Akşam"] ?? "--:--"),
                      ("Yatsı", prayerTimes["Yatsı"] ?? "--:--")]
        
        for (name, time) in prayers {
            if time == "--:--" { continue }
            let components = time.components(separatedBy: ":")
            if components.count == 2,
               let hour = Int(components[0]),
               let minute = Int(components[1]) {
                var prayerDate = calendar.dateBySettingHour(hour, minute: minute, second: 0, of: now) ?? now
                if prayerDate <= now {
                    prayerDate = calendar.date(byAdding: .day, value: 1, to: prayerDate) ?? prayerDate
                }
                if prayerDate > now {
                    let remainingMinutes = Int(prayerDate.timeIntervalSince(now) / 60)
                    return (name, time, remainingMinutes)
                }
            }
        }
        
        return ("İmsak", prayerTimes["İmsak"] ?? "--:--", 0)
    }
    
    private func getCachedPrayerTimes() -> SimpleEntry? {
        let userDefaults = UserDefaults(suiteName: "group.com.mihmandarmobile.widget")
        guard let cachedData = userDefaults?.data(forKey: "cachedPrayerTimes"),
              let cachedEntry = try? JSONDecoder().decode(CachedEntry.self, from: cachedData) else {
            return nil
        }
        
        // Check if cache is still valid (less than 1 hour old)
        if Date().timeIntervalSince(cachedEntry.timestamp) < 3600 {
            return SimpleEntry(
                date: Date(),
                nextPrayer: cachedEntry.nextPrayer,
                nextTime: cachedEntry.nextTime,
                remainingMinutes: cachedEntry.remainingMinutes,
                hijriDate: cachedEntry.hijriDate,
                allPrayerTimes: cachedEntry.allPrayerTimes
            )
        }
        
        return nil
    }
    
    private func cachePrayerTimes(_ entry: SimpleEntry) {
        let userDefaults = UserDefaults(suiteName: "group.com.mihmandarmobile.widget")
        let cachedEntry = CachedEntry(
            timestamp: Date(),
            nextPrayer: entry.nextPrayer,
            nextTime: entry.nextTime,
            remainingMinutes: entry.remainingMinutes,
            hijriDate: entry.hijriDate,
            allPrayerTimes: entry.allPrayerTimes
        )
        
        if let data = try? JSONEncoder().encode(cachedEntry) {
            userDefaults?.set(data, forKey: "cachedPrayerTimes")
        }
    }
    
    private func getDefaultEntry() -> SimpleEntry {
        let hijriFormatter = DateFormatter()
        hijriFormatter.calendar = Calendar(identifier: .islamicUmmAlQura)
        hijriFormatter.dateStyle = .long
        hijriFormatter.locale = Locale(identifier: "tr_TR")
        
        return SimpleEntry(
            date: Date(),
            nextPrayer: "Hata",
            nextTime: "--:--",
            remainingMinutes: 0,
            hijriDate: hijriFormatter.string(from: Date()),
            allPrayerTimes: [
                "İmsak": "--:--",
                "Güneş": "--:--",
                "Öğle": "--:--",
                "İkindi": "--:--",
                "Akşam": "--:--",
                "Yatsı": "--:--"
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

struct CachedEntry: Codable {
    let timestamp: Date
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