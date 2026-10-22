// swift-tools-version: 5.9
import PackageDescription
let package = Package(name: "JamloomLive", platforms: [.macOS("14.2")], products: [.executable(name: "JamloomLive", targets: ["JamloomLive"])], targets: [
    .target(name: "LiveAudio", publicHeadersPath: "include", cxxSettings: [.unsafeFlags(["-std=c++17", "-fobjc-arc"])], linkerSettings: [.linkedFramework("CoreAudio"), .linkedFramework("AppKit"), .linkedFramework("AVFoundation")]),
    .executableTarget(name: "JamloomLive", dependencies: ["LiveAudio"]),
    .testTarget(name: "JamloomLiveTests", dependencies: ["JamloomLive"])
], cxxLanguageStandard: .cxx17)
