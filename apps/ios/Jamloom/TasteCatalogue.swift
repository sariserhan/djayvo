import Foundation

struct TasteChoice: Codable, Equatable, Sendable {
    let id: String
    let rating: String
    var weight: Int
}
enum TasteCatalogue {
    struct Track: Decodable, Identifiable, Sendable {
        let id: String; let title: String; let artist: String; let genre: String; let license: String
    }
    static let tracks: [Track] = {
        struct Manifest: Decodable { let tracks: [Track] }
        guard let url = Bundle.main.url(forResource: "manifest", withExtension: "json"),
              let data = try? Data(contentsOf: url), let manifest = try? JSONDecoder().decode(Manifest.self, from: data) else { return [] }
        return manifest.tracks
    }()
    static func validate(_ choices: [TasteChoice]) throws {
        guard choices.count <= 20, Set(choices.map(\.id)).count == choices.count,
              choices.allSatisfy({ choice in tracks.contains { $0.id == choice.id } && ["love", "like", "avoid"].contains(choice.rating) && (1...5).contains(choice.weight) }) else {
            throw RemixError.message("Invalid catalogue choices. Refresh your preferences before saving.")
        }
    }
    static func scores(_ choices: [TasteChoice]) -> [(genre: String, score: Int)] {
        var values: [String: Int] = [:]
        for choice in choices {
            guard let track = tracks.first(where: { $0.id == choice.id }) else { continue }
            values[track.genre, default: 0] += (choice.rating == "love" ? 2 : choice.rating == "like" ? 1 : -1) * choice.weight
        }
        return values.map { (genre: $0.key, score: $0.value) }.sorted { $0.score == $1.score ? $0.genre < $1.genre : $0.score > $1.score }
    }
}
