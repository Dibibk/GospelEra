import UIKit
import Capacitor
import FirebaseCore
import FirebaseMessaging
import UserNotifications

@UIApplicationMain
class AppDelegate: UIResponder, UIApplicationDelegate {

    var window: UIWindow?

    func application(_ application: UIApplication, didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]?) -> Bool {
        // Configure Firebase FIRST
        FirebaseApp.configure()
        print("[AppDelegate] ✅ Firebase configured")
        
        // Set messaging delegate BEFORE registering for notifications
        Messaging.messaging().delegate = self
        print("[AppDelegate] ✅ Messaging delegate set")
        
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
        print("[AppDelegate] ✅ APNs token set on Messaging")
        
        // Manually fetch FCM token after setting APNs token
        Messaging.messaging().token { token, error in
            if let error = error {
                print("[AppDelegate] ❌ Error fetching FCM token: \(error.localizedDescription)")
            } else if let token = token {
                print("[AppDelegate] ✅ FCM token fetched: \(token.prefix(30))...")
                self.sendFCMTokenToJS(token: token)
            }
        }
    }
    
    func application(_ application: UIApplication, didFailToRegisterForRemoteNotificationsWithError error: Error) {
        print("[AppDelegate] ❌ Failed to register for remote notifications: \(error.localizedDescription)")
    }
    
    // Send FCM token to JavaScript
    private func sendFCMTokenToJS(token: String) {
        print("[AppDelegate] 📤 Sending FCM token to JavaScript...")
        
        DispatchQueue.main.async {
            guard let viewController = self.window?.rootViewController as? CAPBridgeViewController,
                  let webView = viewController.bridge?.webView else {
                print("[AppDelegate] ⚠️ Could not find webView, retrying in 1 second...")
                // Retry after delay if webView not ready
                DispatchQueue.main.asyncAfter(deadline: .now() + 1.0) {
                    self.sendFCMTokenToJS(token: token)
                }
                return
            }
            
            let js = "window.dispatchEvent(new CustomEvent('fcmToken', { detail: { token: '\(token)' } })); console.log('[Native] FCM token event dispatched');"
            webView.evaluateJavaScript(js) { result, error in
                if let error = error {
                    print("[AppDelegate] ❌ Error sending FCM token to JS: \(error.localizedDescription)")
                } else {
                    print("[AppDelegate] ✅ FCM token sent to JavaScript successfully")
                }
            }
        }
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
        print("[AppDelegate] 🔔 MessagingDelegate didReceiveRegistrationToken called")
        
        guard let token = fcmToken else {
            print("[AppDelegate] ❌ FCM token is nil")
            return
        }
        
        print("[AppDelegate] ✅ FCM token from delegate: \(token.prefix(30))...")
        sendFCMTokenToJS(token: token)
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
