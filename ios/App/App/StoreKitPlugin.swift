import Foundation
import Capacitor
import StoreKit

@objc(StoreKitPlugin)
public class StoreKitPlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "StoreKitPlugin"
    public let jsName = "StoreKit"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "getProducts", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "purchase", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "restorePurchases", returnType: CAPPluginReturnPromise)
    ]
    
    private var products: [String: Any] = [:]
    
    @objc func getProducts(_ call: CAPPluginCall) {
        guard let productIds = call.getArray("productIds", String.self) else {
            call.reject("Missing productIds parameter")
            return
        }
        
        if #available(iOS 15.0, *) {
            Task {
                do {
                    let storeProducts = try await Product.products(for: Set(productIds))
                    var result: [[String: Any]] = []
                    
                    for product in storeProducts {
                        self.products[product.id] = product
                        result.append([
                            "id": product.id,
                            "displayName": product.displayName,
                            "description": product.description,
                            "price": product.price.description,
                            "displayPrice": product.displayPrice,
                            "type": product.type.rawValue
                        ])
                    }
                    
                    call.resolve(["products": result])
                } catch {
                    call.reject("Failed to fetch products: \(error.localizedDescription)")
                }
            }
        } else {
            call.reject("StoreKit 2 requires iOS 15.0 or later")
        }
    }
    
    @objc func purchase(_ call: CAPPluginCall) {
        guard let productId = call.getString("productId") else {
            call.reject("Missing productId parameter")
            return
        }
        
        if #available(iOS 15.0, *) {
            guard let product = products[productId] as? Product else {
                call.reject("Product not found. Call getProducts first.")
                return
            }
            
            Task {
                do {
                    let result = try await product.purchase()
                    
                    switch result {
                    case .success(let verification):
                        switch verification {
                        case .verified(let transaction):
                            await transaction.finish()
                            call.resolve([
                                "success": true,
                                "transactionId": String(transaction.id),
                                "productId": transaction.productID,
                                "purchaseDate": transaction.purchaseDate.timeIntervalSince1970 * 1000
                            ])
                        case .unverified(_, let error):
                            call.reject("Transaction verification failed: \(error.localizedDescription)")
                        }
                    case .userCancelled:
                        call.resolve(["success": false, "cancelled": true])
                    case .pending:
                        call.resolve(["success": false, "pending": true])
                    @unknown default:
                        call.reject("Unknown purchase result")
                    }
                } catch {
                    call.reject("Purchase failed: \(error.localizedDescription)")
                }
            }
        } else {
            call.reject("StoreKit 2 requires iOS 15.0 or later")
        }
    }
    
    @objc func restorePurchases(_ call: CAPPluginCall) {
        if #available(iOS 15.0, *) {
            Task {
                do {
                    try await AppStore.sync()
                    var restoredTransactions: [[String: Any]] = []
                    
                    for await result in Transaction.currentEntitlements {
                        if case .verified(let transaction) = result {
                            restoredTransactions.append([
                                "transactionId": String(transaction.id),
                                "productId": transaction.productID,
                                "purchaseDate": transaction.purchaseDate.timeIntervalSince1970 * 1000
                            ])
                        }
                    }
                    
                    call.resolve(["transactions": restoredTransactions])
                } catch {
                    call.reject("Failed to restore purchases: \(error.localizedDescription)")
                }
            }
        } else {
            call.reject("StoreKit 2 requires iOS 15.0 or later")
        }
    }
}
