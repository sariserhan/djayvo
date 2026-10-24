import SwiftUI

struct SongPreference: Codable, Equatable, Sendable {
    var reference: String
    var aspects: [String]
    var weight: Int
    static let allowed = ["gentle", "intense", "slow", "fast", "piano", "guitar", "bass", "drums", "synth", "groove", "melody", "space"]
}

struct TasteProfile: Codable, Equatable, Sendable {
    var version = 1
    var references: [String] = []
    var energy = "balanced"
    var tempo = 110
    var instruments = ["piano", "bass", "drums"]
    var novelty = 50
    var catalogue: [TasteChoice]? = nil
    var songPreferences: [SongPreference]? = nil
    var direction: Int? = nil
    static let availableInstruments = ["piano", "guitar", "bass", "drums", "synth", "voice"]
    func validate() throws {
        try TasteCatalogue.validate(catalogue ?? [])
        let songs = songPreferences ?? []
        guard songs.count <= 20, Set(songs.map(\.reference)).count == songs.count,
              songs.allSatisfy({ references.contains($0.reference) && (1...5).contains($0.weight) &&
                  $0.aspects.count <= 12 && Set($0.aspects).count == $0.aspects.count &&
                  $0.aspects.allSatisfy({ SongPreference.allowed.contains($0) }) }),
              (0...2).contains(direction ?? 0), version == 1, references.count <= 20,
              references.allSatisfy({ !$0.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty && $0.utf16.count <= 160 }),
              ["gentle", "balanced", "intense"].contains(energy), (60...180).contains(tempo),
              (0...100).contains(novelty), !instruments.isEmpty,
              Set(instruments).count == instruments.count,
              instruments.allSatisfy({ Self.availableInstruments.contains($0) }) else {
            throw CocoaError(.validationMissingMandatoryProperty)
        }
    }
    mutating func setReferences(_ text: String) {
        references = text.split(separator: "\n").map { String($0).trimmingCharacters(in: .whitespacesAndNewlines) }.filter { !$0.isEmpty }
        songPreferences = songPreferences?.filter { references.contains($0.reference) }
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
        let values = try url.resourceValues(forKeys: [.isRegularFileKey, .isSymbolicLinkKey, .fileSizeKey])
        guard values.isRegularFile == true, values.isSymbolicLink != true, (values.fileSize ?? 16385) <= 16384 else { throw CocoaError(.fileReadTooLarge) }
        let data = try Data(contentsOf: url)
        guard data.count <= 16384 else { throw CocoaError(.fileReadTooLarge) }
        let value = try JSONDecoder().decode(Self.self, from: data); try value.validate(); return value
    }
}

struct MusicDNAView: View {
    @Environment(\.dynamicTypeSize) private var typeSize
    @ObservedObject var model: AppModel
    @ObservedObject var account: AccountModel
    @State private var showAccount = false
    private enum InputField: Hashable { case references, search }
    @FocusState private var activeInput: InputField?
    @State private var catalogueSearch = ""
    @State private var seconds = 60
    private var direction: Int { profile.direction ?? 0 }
    @State private var profile = TasteProfile()
    @State private var references = ""
    @State private var message = ""
    var body: some View {
        NavigationStack {
            Form {
                Section {
                    Label("Find your sound", systemImage: "waveform.path").font(.title2.bold())
                    Text("Choose a mood. Pick your instruments. Play.").foregroundStyle(.secondary)
                    DisclosureGroup("About local previews") {
                        Text("Favourite song names are personal notes. Local previews use your controls; they do not analyze or download those songs.").font(.footnote)
                    }
                }
                Section("Favourite tracks and artists — one per line") {
                    TextEditor(text: $references).focused($activeInput, equals: .references).frame(minHeight: 100).accessibilityLabel("Favourite tracks and artists")
                }
                Section {
                    DisclosureGroup("Choose catalogue references") {
                    TextField("Search title or artist", text: $catalogueSearch).focused($activeInput, equals: .search)
                    ForEach(TasteCatalogue.tracks.filter { catalogueSearch.isEmpty || "\($0.title) \($0.artist)".localizedCaseInsensitiveContains(catalogueSearch) }) { track in
                        VStack(alignment: .leading) {
                            Text("\(track.title) — \(track.artist)")
                            Text("Jamloom practice master · \(track.genre) · \(track.license)").font(.caption)
                            Picker("Rating for \(track.title)", selection: Binding(get: {
                                profile.catalogue?.first { $0.id == track.id }?.rating ?? "none"
                            }, set: { rating in
                                var choices = profile.catalogue ?? []; choices.removeAll { $0.id == track.id }
                                if rating != "none" { choices.append(TasteChoice(id: track.id, rating: rating, weight: 1)) }; profile.catalogue = choices
                            })) { ForEach(["none", "love", "like", "avoid"], id: \.self) { Text($0.capitalized).tag($0) } }
                            if let index = profile.catalogue?.firstIndex(where: { $0.id == track.id }) {
                                Stepper("Importance: \(profile.catalogue![index].weight)", value: Binding(get: { profile.catalogue![index].weight }, set: { profile.catalogue![index].weight = $0 }), in: 1...5)
                            }
                        }
                    }
                    }
                    ForEach(TasteCatalogue.scores(profile.catalogue ?? []), id: \.genre) { score in Text("\(score.genre): \(score.score)") }
                    DisclosureGroup("How catalogue choices work") {
                        Text("Genre scores use catalogue labels and your ratings. Tempo, key, melody, instruments, language and energy are unknown; your controls remain authoritative.").font(.caption)
                    }
                }
                Section("Your musical direction") {
                    if typeSize.isAccessibilitySize { energyPicker.pickerStyle(.menu) }
                    else { energyPicker.pickerStyle(.segmented) }
                    Stepper("Preferred tempo: \(profile.tempo) BPM", value: $profile.tempo, in: 60...180)
                    Stepper("Room for surprise: \(profile.novelty)%", value: $profile.novelty, in: 0...100, step: 5)
                    LazyVGrid(columns: [GridItem(.adaptive(minimum: 130))], spacing: 12) {
                        ForEach(TasteProfile.availableInstruments, id: \.self) { instrument in
                            Toggle(isOn: Binding(get: { profile.instruments.contains(instrument) }, set: { enabled in
                                profile.instruments.removeAll { $0 == instrument }; if enabled { profile.instruments.append(instrument) }
                            })) {
                                Label(instrument.capitalized, systemImage: ["piano": "pianokeys", "guitar": "guitars", "bass": "guitars.fill", "drums": "circle.grid.cross", "synth": "waveform.path", "voice": "mic.fill"][instrument] ?? "music.note")
                                    .frame(maxWidth: .infinity, minHeight: 44)
                            }.toggleStyle(.button)
                        }
                    }
                }
                Section {
                    Button("Save preferences on this device") {
                        do {
                            profile.setReferences(references)
                            try profile.save(to: TasteProfile.location()); message = "Saved locally. No audio generated or uploaded."
                        } catch { message = "Choose at least one instrument and at most 20 references, up to 160 characters each. Saving must be available on this device." }
                    }
                    Button("Delete saved profile", role: .destructive) {
                        do { let url = try TasteProfile.location(); if FileManager.default.fileExists(atPath: url.path) { try FileManager.default.removeItem(at: url) }; profile = TasteProfile(); references = ""; let feedback = try RemixLibrary.application().root.appendingPathComponent("taste-preference.json"); if FileManager.default.fileExists(atPath: feedback.path) { try FileManager.default.removeItem(at: feedback) }; message = "Profile deleted." }
                        catch { message = "Could not delete the saved profile. Try again." }
                    }
                    Text(message).accessibilityIdentifier("tasteStatus")
                }
                if account.snapshot != nil {
                    Section("Account preferences") {
                        Text("Load replaces these controls with the account version. Save uploads only these preferences. Your recordings and compositions stay here.").font(.caption)
                        Button("Load account profile") { Task { await account.perform {
                            if let saved = try await account.loadTaste() { profile = saved; references = profile.references.joined(separator: "\n") }
                            message = "Account preferences loaded. Save locally to keep them on this device."
                        } } }
                        Button("Save profile to account") { Task { await account.perform {
                            profile.setReferences(references)
                            try await account.saveTaste(profile); message = "Preferences saved to your account."
                        } } }
                        Button("Delete account profile", role: .destructive) { Task { await account.perform {
                            try await account.deleteTaste(); message = "Account profile deleted. Your local copy is unchanged."
                        } } }
                        if !account.message.isEmpty { Text(account.message) }
                    }.disabled(account.busy)
                }
                Section("Compose on this device") {
                    Picker("Composition length", selection: $seconds) {
                        ForEach([30, 60, 90, 120, 180], id: \.self) { Text("\($0) seconds").tag($0) }
                    }
                    Text("Two original instrumental variations from your controls. Song titles are notes, not audio inputs. Exact length follows musical boundaries.").font(.caption)
                    Button("Compose two variations") {
                        profile.setReferences(references)
                        Task { await model.generateTaste(profile: profile, seconds: seconds, direction: direction) }
                    }.disabled(!model.editable).accessibilityIdentifier("composeTaste")
                    if model.busy {
                        ProgressView(model.activity)
                        if model.canCancel { Button("Cancel", action: model.cancel) }
                    }
                }
                ForEach(model.sessions.filter { $0.isTaste }) { session in
                    Section { SavedSessionView(model: model, session: session, prefer: { style in
                        do {
                            guard let recipe = session.taste else { return }
                            let next = ((recipe.direction ?? 0) + (style == "taste_b" ? 1 : 0)) % 3
                            var preferred = recipe.profile; preferred.direction = next
                            try preferred.save(to: TasteProfile.location())
                            try JSONEncoder().encode(next).write(to: RemixLibrary.application().root.appendingPathComponent("taste-preference.json"), options: [.atomic, .completeFileProtection])
                            profile = preferred; references = profile.references.joined(separator: "\n")
                            message = "Variation settings saved for your next composition. No training or upload."
                        } catch { message = "Could not save preference feedback. Try again." }
                    }) }
                }
                Section("Availability") {
                    Text("Local instrumental previews work on this device. Full cloud songs are in Improvise when available. Mix your tracks in DJ Deck. Credit purchases remain closed.")
                }
            }.scrollDismissesKeyboard(.interactively).disabled(account.busy).navigationTitle("My Music DNA").preferredColorScheme(.dark).tint(.mint)
                .toolbar {
                    ToolbarItem(placement: .topBarTrailing) { Button("Account", systemImage: "person.crop.circle") { model.suspendAudio(cancelRender: false); showAccount = true } }
                    ToolbarItemGroup(placement: .keyboard) { Spacer(); Button("Done editing") { activeInput = nil } }
                }
                .sheet(isPresented: $showAccount) { AccountView(account: account) }
                .onDisappear { model.suspendAudio(cancelRender: true) }
                .task { await model.loadLibrary(); do { profile = try TasteProfile.load(from: TasteProfile.location()); references = profile.references.joined(separator: "\n")
                    let feedback = try RemixLibrary.application().root.appendingPathComponent("taste-preference.json")
                    if FileManager.default.fileExists(atPath: feedback.path) {
                        guard (try feedback.resourceValues(forKeys: [.fileSizeKey]).fileSize ?? 100) < 16 else { throw CocoaError(.fileReadTooLarge) }
                        let value = try JSONDecoder().decode(Int.self, from: Data(contentsOf: feedback)); guard (0...2).contains(value) else { throw CocoaError(.fileReadCorruptFile) }; if profile.direction == nil { profile.direction = value }
                    }
                } catch { message = "Saved profile could not be read. Delete it to start again." } }
        }
    }
    private var energyPicker: some View {
        Picker("Energy", selection: $profile.energy) { ForEach(["gentle", "balanced", "intense"], id: \.self) { Text($0.capitalized).tag($0) } }
    }
}
