import Foundation
import StoreKit

// No public purchase UI until server verification, account binding and quality pass.
@MainActor final class CreditPurchases {
    enum PurchaseError: Error { case unavailable, unverified, wrongAccount, wrongProduct }
    static let released = false
    let productIDs = ["com.jamloom.credits.starter", "com.jamloom.credits.creator", "com.jamloom.credits.studio"]
    func products() async throws -> [Product] { try await Product.products(for: productIDs) }
    func purchase(_ product: Product, accountToken: UUID,
                  deliver: (String, UUID) async throws -> Void) async throws {
        guard Self.released else { throw PurchaseError.unavailable }
        guard productIDs.contains(product.id), product.type == .consumable else { throw PurchaseError.wrongProduct }
        switch try await product.purchase(options: [.appAccountToken(accountToken)]) {
        case .success(let result): try await deliverVerified(result, accountToken: accountToken, deliver: deliver)
        case .pending, .userCancelled: break
        @unknown default: throw PurchaseError.unverified
        }
    }
    func deliverVerified(_ result: VerificationResult<Transaction>, accountToken: UUID,
                         deliver: (String, UUID) async throws -> Void) async throws {
        guard case .verified(let transaction) = result else { throw PurchaseError.unverified }
        guard productIDs.contains(transaction.productID), transaction.productType == .consumable,
              transaction.revocationDate == nil else { throw PurchaseError.wrongProduct }
        guard transaction.appAccountToken == accountToken else { throw PurchaseError.wrongAccount }
        // The backend must verify the JWS independently and atomically acknowledge its ledger grant.
        try await deliver(result.jwsRepresentation, accountToken)
        await transaction.finish()
    }
    func reconcileUnfinished(accountToken: UUID, deliver: (String, UUID) async throws -> Void) async throws {
        for await result in Transaction.unfinished {
            // Another Jamloom account's pending purchase must not block this account's recovery.
            if case .verified(let transaction) = result, transaction.appAccountToken != accountToken { continue }
            try await deliverVerified(result, accountToken: accountToken, deliver: deliver)
        }
    }
}
