#!/usr/bin/env python3
"""Download the pinned local audio-style auditor using the existing singer environment."""
from huggingface_hub import snapshot_download
from check_dna_audio import MANIFEST, MODEL, verify_model

if __name__ == '__main__':
    snapshot_download(MANIFEST['repo'], revision=MANIFEST['revision'], local_dir=MODEL,
                      allow_patterns=list(MANIFEST['files_sha256']), token=False)
    verify_model()
    print('Pinned Music DNA audio auditor verified.')
