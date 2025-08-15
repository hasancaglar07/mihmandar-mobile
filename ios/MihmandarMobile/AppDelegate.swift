import UIKit
import BackgroundTasks
import React
import React_RCTAppDelegate
import ReactAppDependencyProvider

@main
class AppDelegate: UIResponder, UIApplicationDelegate {
  var window: UIWindow?

  var reactNativeDelegate: ReactNativeDelegate?
  var reactNativeFactory: RCTReactNativeFactory?

  func application(
    _ application: UIApplication,
    didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]? = nil
  ) -> Bool {
    let delegate = ReactNativeDelegate()
    let factory = RCTReactNativeFactory(delegate: delegate)
    delegate.dependencyProvider = RCTAppDependencyProvider()

    reactNativeDelegate = delegate
    reactNativeFactory = factory

    window = UIWindow(frame: UIScreen.main.bounds)

    factory.startReactNative(
      withModuleName: "MihmandarMobile",
      in: window,
      launchOptions: launchOptions
    )

    // Register background task for daily refresh
    if #available(iOS 13.0, *) {
      BGTaskScheduler.shared.register(forTaskWithIdentifier: "org.mihmandar.mobile.dailyrefresh", using: nil) { task in
        self.handleAppRefresh(task: task as! BGAppRefreshTask)
      }
      self.scheduleDailyRefresh()
    }
    return true
  }
}

class ReactNativeDelegate: RCTDefaultReactNativeFactoryDelegate {
  override func sourceURL(for bridge: RCTBridge) -> URL? {
    self.bundleURL()
  }

  override func bundleURL() -> URL? {
#if DEBUG
    RCTBundleURLProvider.sharedSettings().jsBundleURL(forBundleRoot: "index")
#else
    Bundle.main.url(forResource: "main", withExtension: "jsbundle")
#endif
  }
}

// MARK: - Background refresh helpers
extension AppDelegate {
  @available(iOS 13.0, *)
  func scheduleDailyRefresh() {
    let request = BGAppRefreshTaskRequest(identifier: "org.mihmandar.mobile.dailyrefresh")
    // Earliest allowed: 3am local time approx via earliestBeginDate
    request.earliestBeginDate = Calendar.current.date(bySettingHour: 3, minute: 0, second: 0, of: Date().addingTimeInterval(3600))
    do { try BGTaskScheduler.shared.submit(request) } catch { }
  }

  @available(iOS 13.0, *)
  func handleAppRefresh(task: BGAppRefreshTask) {
    scheduleDailyRefresh()
    let queue = OperationQueue()
    task.expirationHandler = {
      queue.cancelAllOperations()
    }
    queue.addOperation {
      // Best-effort: poke widget timelines via notification
      NotificationCenter.default.post(name: Notification.Name("MihmandarDailyRefresh"), object: nil)
    }
    queue.addOperation {
      task.setTaskCompleted(success: true)
    }
  }
}
