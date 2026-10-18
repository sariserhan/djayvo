"""Audio validation with real FFmpeg; the model is stubbed, with no weights needed."""
import json
from pathlib import Path
import subprocess
import sys
import tempfile
from types import SimpleNamespace
import unittest
from unittest.mock import Mock, patch
import wave
import numpy as np

sys.path.insert(0,str(Path(__file__).resolve().parents[1]/"scripts"))
from analyze_words import analyze


class WordAudio(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name)
        self.source = self.root/"source.wav"
        manifest = self.root/"assets/manifests/word-timing-tiny.json"
        manifest.parent.mkdir(parents=True)
        manifest.write_text(json.dumps({"files":{}}))
        self.model = Mock()
        self.model.return_value.transcribe.return_value = ([],SimpleNamespace(language="en",language_probability=1.))
        # Model and manifest are test doubles; PCM decoding and validation are real.
        for patcher in (patch("analyze_words.ROOT",self.root),
                        patch.dict(sys.modules,{"faster_whisper":SimpleNamespace(WhisperModel=self.model)})):
            patcher.start()
            self.addCleanup(patcher.stop)

    def write_source(self, pcm, rate=16000):
        if pcm.ndim==1:pcm=pcm[:,None]
        with wave.open(str(self.source),"wb") as wav:
            wav.setparams((pcm.shape[1],2,rate,0,"NONE","not compressed"))
            wav.writeframes(np.rint(pcm*32768).astype("<i2").tobytes())

    def test_constant_offsets_and_quiet_variation_rejected_before_model(self):
        for rate in (8000,44100,192000):
            for offset in (0.,-.5,.5):
                for amplitude in (0.,.0001):
                    with self.subTest(rate=rate,offset=offset,amplitude=amplitude):
                        self.write_source(offset+amplitude*np.sin(np.arange(3*rate)*2*np.pi*220/rate),rate)
                        with self.assertRaisesRegex(ValueError,"Silence or invalid"):
                            analyze(self.source,self.root)
        self.model.assert_not_called()

    def test_invalid_decoded_output_rejected_before_model(self):
        self.write_source(np.zeros(48000))
        for pcm in (np.zeros(0),np.sin(np.arange(31999)*.1),np.ones(80001),
                    np.full(48000,np.nan),np.full(48000,np.inf)):
            with self.subTest(frames=len(pcm)), patch("analyze_words.subprocess.run",return_value=SimpleNamespace(stdout=pcm.astype("<f4").tobytes())):
                with self.assertRaisesRegex(ValueError,"Silence or invalid"):
                    analyze(self.source,self.root)
        self.model.assert_not_called()

    def test_valid_offset_pcm_reaches_model_unchanged(self):
        for seconds in (2,5):
            with self.subTest(seconds=seconds):
                self.write_source(.5+.02*np.sin(np.arange(seconds*16000)*2*np.pi*220/16000))
                before=self.source.read_bytes()
                expected=subprocess.run(["ffmpeg","-v","error","-nostdin","-i",str(self.source),
                                         "-ar","16000","-ac","1","-f","f32le","pipe:1"],
                                        capture_output=True,check=True,timeout=15).stdout
                analyze(self.source,self.root)
                actual=self.model.return_value.transcribe.call_args.args[0]
                self.assertEqual(actual.tobytes(),expected)
                self.assertEqual(self.source.read_bytes(),before)


if __name__=="__main__":unittest.main()
