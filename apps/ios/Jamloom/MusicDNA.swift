import SwiftUI

struct TasteProfile: Codable, Equatable {
    var version = 1
    var references: [String] = []
    var energy = "balanced"
    var tempo = 110
    var instruments = ["piano", "bass", "drums"]
    var novelty = 50
    static let availableInstruments = ["piano", "guitar", "bass", "drums", "synth", "voice"]
    func validate() throws {
        guard version == 1, references.count <= 20,
              references.allSatisfy({ !$0.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty && $0.utf16.count <= 160 }),
              ["gentle", "balanced", "intense"].contains(energy), (60...180).contains(tempo),
              (0...100).contains(novelty), !instruments.isEmpty,
              Set(instruments).count == instruments.count,
              instruments.allSatisfy({ Self.availableInstruments.contains($0) }) else {
            throw CocoaError(.validationMissingMandatoryProperty)
        }
    }
    static func location() throws -> URL { try RemixLibrary.application().root.appendingPathComponent("taste-profile.json") }
    func save(to url: URL) throws {
        try validate()
        let data = try JSONEncoder().encode(self)
        guard data.count <= 16384 else { throw CocoaError(.fileWriteOutOfSpace) }
        try data.write(to: url, options: [.atomic, .completeFileProtection])
    }
    static func load(from url: URL) throws -> Self {
        guard FileManager.default.fileExists(atPath: url.path) else { return Self() }
        let data = try Data(contentsOf: url)
        guard data.count <= 16384 else { throw CocoaError(.fileReadTooLarge) }
        let value = try JSONDecoder().decode(Self.self, from: data); try value.validate(); return value
    }
}

struct MusicDNAView: View {
    @State private var profile = TasteProfile()
    @State private var references = ""
    @State private var message = ""
    var body: some View {
        NavigationStack {
            Form {
                Section {
                    Text("Your preferences, with room for surprise.").font(.title2.bold())
                    Text("Favourite song names are personal notes. Jamloom does not download or train on those recordings, or infer their tempo from a title.")
                }
                Section("Favourite tracks and artists — one per line") {
                    TextEditor(text: $references).frame(minHeight: 100).accessibilityLabel("Favourite tracks and artists")
                }
                Section("Your musical direction") {
                    Picker("Energy", selection: $profile.energy) { ForEach(["gentle", "balanced", "intense"], id: \.self) { Text($0).tag($0) } }
                    Stepper("Preferred tempo: \(profile.tempo) BPM", value: $profile.tempo, in: 60...180)
                    Stepper("Room for surprise: \(profile.novelty)%", value: $profile.novelty, in: 0...100, step: 5)
                    ForEach(TasteProfile.availableInstruments, id: \.self) { instrument in
                        Toggle(instrument.capitalized, isOn: Binding(get: { profile.instruments.contains(instrument) }, set: { enabled in
                            profile.instruments.removeAll { $0 == instrument }; if enabled { profile.instruments.append(instrument) }
                        }))
                    }
                }
                Section {
                    Button("Save preferences on this device") {
                        do {
                            profile.references = references.split(separator: "\n").map { String($0).trimmingCharacters(in: .whitespaces) }
                            try profile.save(to: TasteProfile.location()); message = "Saved locally. No audio generated or uploaded."
                        } catch { message = "Choose at least one instrument and at most 20 references, up to 160 characters each. Saving must be available on this device." }
                    }
                    Button("Delete saved profile", role: .destructive) {
                        do { let url = try TasteProfile.location(); if FileManager.default.fileExists(atPath: url.path) { try FileManager.default.removeItem(at: url) }; profile = TasteProfile(); references = ""; message = "Profile deleted." }
                        catch { message = "Could not delete the saved profile. Try again." }
                    }
                    Text(message).accessibilityIdentifier("tasteStatus")
                }
                Section("Availability") {
                    Text("Taste-driven audio, account sync and credit purchases are not released. Local improvisation is in the other tab. DJ Studio and Live Audio DJ are desktop experiences.")
                }
            }.navigationTitle("My Music DNA")
                .task { do { profile = try TasteProfile.load(from: TasteProfile.location()); references = profile.references.joined(separator: "\n") } catch { message = "Saved profile could not be read. Delete it to start again." } }
        }
    }
}
