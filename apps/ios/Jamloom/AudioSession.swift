import AVFoundation

// Session activation can block; serialize it away from the UI and audio callbacks.
enum AudioSession {
    private static let queue = DispatchQueue(label: "com.jamloom.audio-session")
    static func activate(recording: Bool) async throws {
        try await withCheckedThrowingContinuation { (continuation: CheckedContinuation<Void, Error>) in
            queue.async {
                do {
                    let session = AVAudioSession.sharedInstance()
                    try session.setCategory(recording ? .playAndRecord : .playback, mode: .default,
                                            options: recording ? [.defaultToSpeaker] : [])
                    try session.setActive(true)
                    continuation.resume()
                } catch { continuation.resume(throwing: error) }
            }
        }
    }
    static func deactivate() {
        queue.async { try? AVAudioSession.sharedInstance().setActive(false, options: .notifyOthersOnDeactivation) }
    }
    static func preparePlayer(_ url: URL) async throws -> AVAudioPlayer {
        try await withCheckedThrowingContinuation { continuation in
            queue.async {
                do {
                    let player = try AVAudioPlayer(contentsOf: url)
                    guard player.prepareToPlay() else { throw RemixError.message("This mix could not be prepared for playback.") }
                    continuation.resume(returning: player)
                } catch { continuation.resume(throwing: error) }
            }
        }
    }
}
