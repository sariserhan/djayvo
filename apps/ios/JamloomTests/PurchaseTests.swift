import XCTest
import StoreKit
import StoreKitTest
@testable import Jamloom

@MainActor final class PurchaseTests: XCTestCase {
    func testLocalStoreKitAcknowledgmentRecoveryAndAccountBinding() async throws {
        let session = try SKTestSession(configurationFileNamed: "LocalCredits")
        session.disableDialogs = true; session.clearTransactions()
        defer { session.clearTransactions() }
        let product = "com.jamloom.credits.starter", token = UUID(), purchases = CreditPurchases()
        let products = try await purchases.products()
        XCTAssertEqual(products.first?.id, product)
        XCTAssertFalse(try XCTUnwrap(products.first).displayPrice.isEmpty)
        let transaction = try await session.buyProduct(identifier: product, options: [.appAccountToken(token)])
        let latest = await StoreKit.Transaction.latest(for: product)
        let result = try XCTUnwrap(latest)
        var delivered = 0
        do {
            try await purchases.deliverVerified(result, accountToken: UUID()) { _, _ in delivered += 1 }
            XCTFail("Wrong account must remain unfinished")
        } catch CreditPurchases.PurchaseError.wrongAccount { }
        do {
            try await purchases.deliverVerified(result, accountToken: token) { _, _ in throw URLError(.notConnectedToInternet) }
            XCTFail("Failed server delivery must remain unfinished")
        } catch { }
        XCTAssertEqual(delivered, 0)
        var unfinished: [UInt64] = []
        for await value in StoreKit.Transaction.unfinished { if case .verified(let tx) = value { unfinished.append(tx.id) } }
        XCTAssertTrue(unfinished.contains(transaction.id))
        try await purchases.reconcileUnfinished(accountToken: token) { jws, account in
            XCTAssertEqual(account, token); XCTAssertEqual(jws.split(separator: ".").count, 3); delivered += 1
        }
        XCTAssertEqual(delivered, 1)
        unfinished = []
        for await value in StoreKit.Transaction.unfinished { if case .verified(let tx) = value { unfinished.append(tx.id) } }
        XCTAssertFalse(unfinished.contains(transaction.id))
        XCTAssertFalse(CreditPurchases.released)
    }
}
