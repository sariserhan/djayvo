import AVFoundation

struct AudioInput: Sendable {
    let samples: [Float]
    let rate: Double
    var duration: Double { Double(samples.count) / rate }
    let waveform: [Float]
    init(samples: [Float], rate: Double) {
        self.samples = samples
        self.rate = rate
        waveform = (0..<100).map { bucket in
            let start = bucket * samples.count / 100
            let end = max(start + 1, (bucket + 1) * samples.count / 100)
            return samples[start..<min(end, samples.count)].reduce(Float(0)) { max($0, abs($1)) }
        }
    }

    static func read(_ url: URL) throws -> AudioInput {
        let values = try url.resourceValues(forKeys: [.fileSizeKey, .isRegularFileKey])
        guard values.isRegularFile == true, let size = values.fileSize, size > 0, size <= 64 * 1024 * 1024 else {
            throw RemixError.message("Choose an audio file smaller than 64 MB.")
        }
        let file = try AVAudioFile(forReading: url)
        let rate = file.processingFormat.sampleRate
        let channels = Int(file.processingFormat.channelCount)
        let duration = Double(file.length) / rate
        guard (8000...192000).contains(rate), (1...2).contains(channels), (1...15.001).contains(duration) else {
            throw RemixError.message("Choose 1–15 seconds of mono or stereo audio.")
        }
        guard let buffer = AVAudioPCMBuffer(pcmFormat: file.processingFormat, frameCapacity: AVAudioFrameCount(file.length)) else {
            throw RemixError.message("Could not read this recording.")
        }
        try file.read(into: buffer)
        guard Int64(buffer.frameLength) == file.length, let data = buffer.floatChannelData else {
            throw RemixError.message("The recording is incomplete or unsupported.")
        }
        var mono = [Float](repeating: 0, count: Int(buffer.frameLength))
        for frame in mono.indices {
            for channel in 0..<channels {
                let value = data[channel][frame]
                guard value.isFinite, abs(value) <= 1.001 else { throw RemixError.message("The recording contains invalid samples.") }
                mono[frame] += value / Float(channels)
            }
        }
        return AudioInput(samples: mono, rate: rate)
    }

    func writeTrimmed(to url: URL, start: Double, end: Double, extended: Bool = false) throws {
        guard start.isFinite, end.isFinite, start >= 0, end <= duration + 0.000001,
              end - start >= (extended ? 0.999999 : 1.999999), end - start <= (extended ? 15.000001 : 5.000001) else {
            throw RemixError.message("Select a clip within the allowed duration.")
        }
        let first = Int((start * rate).rounded())
        // Round duration once so decimal slider positions retain an exact two-second selection.
        let last = min(samples.count, first + Int(((end - start) * rate).rounded()))
        guard !FileManager.default.fileExists(atPath: url.path), last > first,
              let format = AVAudioFormat(standardFormatWithSampleRate: rate, channels: 1),
              let buffer = AVAudioPCMBuffer(pcmFormat: format, frameCapacity: AVAudioFrameCount(last - first)),
              let channel = buffer.floatChannelData?[0] else { throw RemixError.message("Could not prepare the selected clip.") }
        buffer.frameLength = buffer.frameCapacity
        for i in first..<last { channel[i - first] = samples[i] }
        let file = try AVAudioFile(forWriting: url, settings: [AVFormatIDKey: kAudioFormatLinearPCM,
            AVSampleRateKey: rate, AVNumberOfChannelsKey: 1, AVLinearPCMBitDepthKey: 16,
            AVLinearPCMIsFloatKey: false, AVLinearPCMIsBigEndianKey: false])
        try file.write(from: buffer)
    }
}
