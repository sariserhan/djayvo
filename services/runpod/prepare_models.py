"""Build-time public downloads only; private project files never enter the image."""
import json
from pathlib import Path
import sys
import urllib.request
from huggingface_hub import snapshot_download

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT/'scripts'))
from singing_response import digest, runtime


def fetch(manifest_name, target):
    manifest = json.loads((ROOT/'assets/manifests'/manifest_name).read_text())
    snapshot_download(manifest['repo'], revision=manifest['revision'], local_dir=target,
                      allow_patterns=list(manifest['files_sha256']), max_workers=3)
    for name, expected in manifest['files_sha256'].items():
        if digest(target/name) != expected:
            raise ValueError('Public model checksum mismatch')


def main():
    upstream = ROOT/'build-style-training/upstream'
    singer = json.loads((ROOT/'assets/manifests/singing-model.json').read_text())
    snapshot_download('ACE-Step/Ace-Step1.5', revision=singer['weight_revision'],
        local_dir=upstream/'checkpoints', max_workers=3,
        allow_patterns=['README.md', 'config.json', 'Qwen3-Embedding-0.6B/*', 'acestep-v15-turbo/*',
                        'vae/*', 'acestep-5Hz-lm-1.7B/*'])
    fetch('lyric-planner-cuda.json', ROOT/'build-style-training/lyric-planner-cuda')
    fetch('dna-auditor.json', ROOT/'build-style-training/taste-auditor')
    speech = json.loads((ROOT/'assets/manifests/word-timing-tiny.json').read_text())
    target = ROOT/'build-speech-tools/faster-whisper-tiny'
    snapshot_download(speech['repository'], revision=speech['revision'], local_dir=target,
                      allow_patterns=list(speech['files']), max_workers=3)
    for name, receipt in speech['files'].items():
        if digest(target/name) != receipt['sha256']:
            raise ValueError('Speech model checksum mismatch')
    separator = json.loads((ROOT/'assets/manifests/singer-separation.json').read_text())
    target = ROOT/'build-style-training/separator/hdemucs_high_trained.pt'
    target.parent.mkdir(parents=True, exist_ok=True)
    with urllib.request.urlopen(separator['url'], timeout=120) as response, target.open('wb') as output:
        while chunk := response.read(1024*1024):
            output.write(chunk)
    if digest(target) != separator['sha256']:
        raise ValueError('Separator checksum mismatch')
    runtime(upstream)
    print('PASS: pinned public models verified')


if __name__ == '__main__':
    main()
