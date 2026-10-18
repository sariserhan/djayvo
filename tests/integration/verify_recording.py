#!/usr/bin/env python3
"""Optional FFmpeg integration: real local M4A conversion, consent and preservation."""
import argparse
import hashlib
import json
from pathlib import Path
import subprocess
import sys
import tempfile
sys.path.insert(0,str(Path(__file__).resolve().parents[2]/'scripts'))
from make_fixture import make_signal
from remix_recording import remix_recording
from verify_export import verify_export


def main():
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--renderer',type=Path,required=True)
    args=parser.parse_args()
    with tempfile.TemporaryDirectory(prefix='djayvo-recording-') as directory:
        root=Path(directory);source=root/'signal.wav';make_signal(source)
        encoded=root/'recording.m4a'
        subprocess.run(['ffmpeg','-v','error','-n','-i',str(source),'-c:a','aac',str(encoded)],check=True,timeout=20)
        before=hashlib.sha256(encoded.read_bytes()).hexdigest()
        try:remix_recording(encoded,root/'denied',args.renderer)
        except ValueError:pass
        else:raise AssertionError('missing consent accepted')
        assert not (root/'denied').exists()
        page=remix_recording(encoded,root/'complete',args.renderer,True)
        assert page.read_text().count('<audio ')==3
        assert json.loads((page.parent/'session.json').read_text())['status']=='complete'
        assert len(verify_export(page.parent/'remix')['artifacts'])==24
        snapshot={p.name:hashlib.sha256(p.read_bytes()).hexdigest() for p in page.parent.iterdir() if p.is_file()}
        try:remix_recording(encoded,page.parent,args.renderer,True)
        except FileExistsError:pass
        else:raise AssertionError('existing recording session replaced')
        assert snapshot=={p.name:hashlib.sha256(p.read_bytes()).hexdigest() for p in page.parent.iterdir() if p.is_file()}
        assert hashlib.sha256(encoded.read_bytes()).hexdigest()==before
        empty=root/'existing-empty';empty.mkdir()
        try:remix_recording(encoded,empty,args.renderer,True)
        except FileExistsError:pass
        else:raise AssertionError('existing empty directory reused')
        invalid=root/'bad.m4a';invalid.write_bytes(b'not an audio file'*8)
        try:remix_recording(invalid,root/'bad-output',args.renderer,True)
        except subprocess.CalledProcessError:pass
        else:raise AssertionError('invalid M4A accepted')
        assert not (root/'bad-output').exists()
    print('PASS: actual M4A decode/render, consent, completion hashes, three players, existing-directory/input preservation and corrupt-input rejection')
    print('NOT RUN: human listening; this is an original procedural test signal')


if __name__=='__main__':main()
