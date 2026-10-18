"""Small PCM comparison regression; does not assert musical quality."""
import array
from pathlib import Path
import sys
import tempfile
import unittest
import wave

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "scripts"))
from review_cloud_music import difference


class WaveformComparison(unittest.TestCase):
    def test_repeat_and_changed_samples(self):
        with tempfile.TemporaryDirectory() as directory:
            paths = [Path(directory) / f"{i}.wav" for i in range(3)]
            for path, values, rate in zip(paths, ([0, 100, -100, 0], [0, 101, -100, 0], [0, 100, -100, 0]), (48000, 48000, 44100)):
                pcm = array.array("h", values)
                if sys.byteorder != "little":
                    pcm.byteswap()
                with wave.open(str(path), "wb") as out:
                    out.setparams((2, 2, rate, 0, "NONE", "not compressed"))
                    out.writeframes(pcm.tobytes())
            self.assertEqual(difference(paths[0], paths[0])["rms_pcm_difference"], 0)
            result = difference(paths[0], paths[1])
            self.assertEqual(result["maximum_pcm_difference"], 1 / 32768)
            self.assertEqual(result["rms_pcm_difference"], .5 / 32768)
            self.assertEqual(result["equal_sample_fraction"], .75)
            with self.assertRaises(AssertionError):
                difference(paths[0], paths[2])


if __name__ == "__main__":
    unittest.main()
