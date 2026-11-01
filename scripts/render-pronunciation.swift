import Foundation
import AVFoundation
let args = CommandLine.arguments
let synth = AVSpeechSynthesizer()
let attributed = NSAttributedString(string: args.count > 3 ? args[3] : "decrease", attributes: [NSAttributedString.Key(AVSpeechSynthesisIPANotationAttribute): args[1]])
let utterance = AVSpeechUtterance(attributedString: attributed)
utterance.voice = AVSpeechSynthesisVoice(language: "en-US")
utterance.rate = 0.42
var output: AVAudioFile?
var completed = false
synth.write(utterance) { buffer in
    guard let pcm = buffer as? AVAudioPCMBuffer else { return }
    if pcm.frameLength == 0 { completed = true; return }
    do {
        if output == nil { output = try AVAudioFile(forWriting: URL(fileURLWithPath: args[2]), settings: pcm.format.settings) }
        try output?.write(from: pcm)
    } catch { print(error); exit(1) }
}
let deadline = Date().addingTimeInterval(40)
while !completed && Date() < deadline { RunLoop.current.run(until: Date().addingTimeInterval(0.05)) }
if !completed { print("Timeout"); exit(1) }
output = nil
