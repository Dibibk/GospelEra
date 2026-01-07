import UIKit
import Capacitor
import Firebase
import FirebaseMessaging
import UserNotifications

@UIApplicationMain
class AppDelegate: UIResponder, UIApplicationDelegate, UNUserNotificationCenterDelegate, MessagingDelegate {

    var window: UIWindow?

    func application(
        _ application: UIApplication,
        didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]?
    ) -> Bool {

        // 🔥 Firebase
        FirebaseApp.configure()

        // 🔔 Delegates
        UNUserNotificationCenter.current().delegate = self
        Messaging.messaging().delegate = self

        // ✅ Register for APNs
        application.registerForRemoteNotifications()

        // ✅ Debug basics
        print("✅✅✅ [AppDelegate] didFinishLaunching")
        print("✅✅✅ [AppDelegate] Bundle ID: \(Bundle.main.bundleIdentifier ?? "nil")")
        print("✅✅✅ [AppDelegate] Firebase configured + delegates set + registerForRemoteNotifications called")

        // ✅ Force-fetch FCM token (very useful to see Firebase errors)
        Messaging.messaging().token { token, error in
            if let error = error {
                print("❌❌❌ [FCM] Messaging.token error: \(error.localizedDescription)")
            } else {
                print("✅✅✅ [FCM] Messaging.token fetched: \(token ?? "nil")")
            }
        }

        return true
    }

    // ✅ APNs token success
    func application(
        _ application: UIApplication,
        didRegisterForRemoteNotificationsWithDeviceToken deviceToken: Data
    ) {
        // Set APNs token for Firebase Messaging
        Messaging.messaging().apnsToken = deviceToken

        let tokenParts = deviceToken.map { data in String(format: "%02.2hhx", data) }
        let apnsToken = tokenParts.joined()

        print("✅✅✅ [APNs] didRegisterForRemoteNotificationsWithDeviceToken fired")
        print("✅✅✅ [APNs] device token: \(apnsToken)")
        print("✅✅✅ [APNs] set Messaging.messaging().apnsToken")
    }

    // ❌ APNs token failure
    func application(
        _ application: UIApplication,
        didFailToRegisterForRemoteNotificationsWithError error: Error
    ) {
        print("❌❌❌ [APNs] didFailToRegisterForRemoteNotificationsWithError: \(error.localizedDescription)")
    }

    // ✅ FCM token callback (Firebase Messaging Delegate)
    func messaging(_ messaging: Messaging, didReceiveRegistrationToken fcmToken: String?) {
    print("✅✅✅ [FCM] didReceiveRegistrationToken fired")
    print("✅✅✅ [FCM] token: \(fcmToken ?? "nil")")

    // ✅ Send token to Capacitor WebView (JS) via NotificationCenter
    NotificationCenter.default.post(
        name: Notification.Name("FCMToken"),
        object: nil,
        userInfo: ["token": fcmToken ?? ""]
    )
    }


    // ✅ Show notification while app is foreground
    func userNotificationCenter(
        _ center: UNUserNotificationCenter,
        willPresent notification: UNNotification,
        withCompletionHandler completionHandler: @escaping (UNNotificationPresentationOptions) -> Void
    ) {
        print("✅✅✅ [UNUserNotificationCenter] notification received in foreground")
        completionHandler([.banner, .badge, .sound])
    }

    // ✅ User tapped notification
    func userNotificationCenter(
        _ center: UNUserNotificationCenter,
        didReceive response: UNNotificationResponse,
        withCompletionHandler completionHandler: @escaping () -> Void
    ) {
        print("✅✅✅ [UNUserNotificationCenter] notification tapped: \(response.notification.request.content.userInfo)")
        completionHandler()
    }

    // Capacitor deep links
    func application(
        _ app: UIApplication,
        open url: URL,
        options: [UIApplication.OpenURLOptionsKey: Any] = [:]
    ) -> Bool {
        return ApplicationDelegateProxy.shared.application(app, open: url, options: options)
    }

    // Capacitor universal links
    func application(
        _ application: UIApplication,
        continue userActivity: NSUserActivity,
        restorationHandler: @escaping ([UIUserActivityRestoring]?) -> Void
    ) -> Bool {
        return ApplicationDelegateProxy.shared.application(application, continue: userActivity, restorationHandler: restorationHandler)
    }
}
