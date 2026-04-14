import SafariServices
import os.log

let SFExtensionMessageKey = "message"

class SafariWebExtensionHandler: NSObject, NSExtensionRequestHandling {

    func beginRequest(with context: NSExtensionContext) {
        let request = context.inputItems.first as? NSExtensionItem

        let profile: UUID?
        if #available(iOS 17.0, macOS 14.0, *) {
            profile = request?.userInfo?[SFExtensionProfileKey] as? UUID
        } else {
            profile = nil
        }

        let message: Any?
        if #available(iOS 15.0, macOS 11.0, *) {
            message = (request?.userInfo?[SFExtensionMessageKey])
        } else {
            message = nil
        }
        os_log(.default, "Received message from browser-native messaging: %@ (profile: %@)", String(describing: message), profile.map(\.uuidString) ?? "none")

        let response = NSExtensionItem()
        response.userInfo = [ SFExtensionMessageKey: [ "Response to": message ] ]

        context.completeRequest(returningItems: [ response ], completionHandler: nil)
    }
}
