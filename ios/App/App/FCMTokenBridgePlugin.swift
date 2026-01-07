import Foundation
import Capacitor

@objc(FCMTokenBridgePlugin)
public class FCMTokenBridgePlugin: CAPPlugin {

    public override func load() {
        NotificationCenter.default.addObserver(
            self,
            selector: #selector(onFCMToken(notification:)),
            name: Notification.Name("FCMToken"),
            object: nil
        )
    }

    @objc func onFCMToken(notification: Notification) {
        let token = (notification.userInfo?["token"] as? String) ?? ""
        self.notifyListeners("fcmToken", data: ["token": token])
    }
}
