import UIKit
import Capacitor
import FirebaseCore
import FirebaseMessaging
import UserNotifications

@UIApplicationMain
class AppDelegate: UIResponder, UIApplicationDelegate {

    var window: UIWindow?

    func application(_ application: UIApplication, didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]?) -> Bool {
        // Configure Firebase first
        FirebaseApp.configure()
        print("[AppDelegate] ✅ Firebase configured")
        
        // Set messaging delegate to receive FCM tokens
        Messaging.messaging().delegate = self
        
        // Set notification center delegate for foreground notifications
        UNUserNotificationCenter.current().delegate = self
        
        // Register for remote notifications
        application.registerForRemoteNotifications()
        print("[AppDelegate] ✅ Registered for remote notifications")
        
        return true
    }

    // MARK: - APNs Token Handling
    
    func application(_ application: UIApplication, didRegisterForRemoteNotificationsWithDeviceToken deviceToken: Data) {
        let tokenString = deviceToken.map { String(format: "%02.2hhx", $0) }.joined()
        print("[AppDelegate] ✅ APNs token received: \(tokenString.prefix(20))...")
        
        // Pass APNs token to Firebase - it will exchange for FCM token
        Messaging.messaging().apnsToken = deviceToken
    }
    
    func application(_ application: UIApplication, didFailToRegisterForRemoteNotificationsWithError error: Error) {
        print("[AppDelegate] ❌ Failed to register for remote notifications: \(error.localizedDescription)")
    }

    // MARK: - URL Handling
    
    func application(_ app: UIApplication, open url: URL, options: [UIApplication.OpenURLOptionsKey: Any] = [:]) -> Bool {
        return ApplicationDelegateProxy.shared.application(app, open: url, options: options)
    }

    func application(_ application: UIApplication, continue userActivity: NSUserActivity, restorationHandler: @escaping ([UIUserActivityRestoring]?) -> Void) -> Bool {
        return ApplicationDelegateProxy.shared.application(application, continue: userActivity, restorationHandler: restorationHandler)
    }
}

// MARK: - Firebase Messaging Delegate

extension AppDelegate: MessagingDelegate {
    func messaging(_ messaging: Messaging, didReceiveRegistrationToken fcmToken: String?) {
        guard let token = fcmToken else {
            print("[AppDelegate] ❌ FCM token is nil")
            return
        }
        
        print("[AppDelegate] ✅ FCM token received: \(token.prefix(30))...")
        print("[AppDelegate] 📤 Sending FCM token to JavaScript...")
        
        // Send FCM token to JavaScript via Capacitor bridge
        DispatchQueue.main.async {
            if let viewController = self.window?.rootViewController as? CAPBridgeViewController {
                let js = "window.dispatchEvent(new CustomEvent('fcmToken', { detail: { token: '\(token)' } }));"
                viewController.bridge?.webView?.evaluateJavaScript(js) { result, error in
                    if let error = error {
                        print("[AppDelegate] ❌ Error sending FCM token to JS: \(error)")
                    } else {
                        print("[AppDelegate] ✅ FCM token sent to JavaScript successfully")
                    }
                }
            } else {
                print("[AppDelegate] ⚠️ Could not find CAPBridgeViewController")
            }
        }
    }
}

// MARK: - User Notification Center Delegate

extension AppDelegate: UNUserNotificationCenterDelegate {
    // Show notification banner when app is in foreground
    func userNotificationCenter(_ center: UNUserNotificationCenter, willPresent notification: UNNotification, withCompletionHandler completionHandler: @escaping (UNNotificationPresentationOptions) -> Void) {
        print("[AppDelegate] 📬 Notification received in foreground: \(notification.request.content.title)")
        // Show banner, badge, and play sound even in foreground
        completionHandler([.banner, .badge, .sound])
    }
    
    // Handle notification tap
    func userNotificationCenter(_ center: UNUserNotificationCenter, didReceive response: UNNotificationResponse, withCompletionHandler completionHandler: @escaping () -> Void) {
        let userInfo = response.notification.request.content.userInfo
        print("[AppDelegate] 👆 Notification tapped: \(userInfo)")
        completionHandler()
    }
}
