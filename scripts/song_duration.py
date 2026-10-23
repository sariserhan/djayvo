"""Shared product length bounds; a saved duration survives retries."""
import hashlib
import json
from pathlib import Path

LIMITS=json.loads((Path(__file__).resolve().parents[1]/'assets/manifests/song-durations.json').read_text())
MAX_SONG_BYTES=LIMITS['music-dna']['max']*192000+44

def validate_duration(product, seconds):
    bounds=LIMITS[product]
    if type(seconds) is not int or not bounds['min']<=seconds<=bounds['max']:
        raise ValueError('Invalid song duration')
    return seconds

def choose_duration(product, seed, seconds=None):
    if seconds is not None:return validate_duration(product,seconds)
    bounds=LIMITS[product]
    value=int.from_bytes(hashlib.sha256(f'jamloom-duration-1:{product}:{seed}'.encode()).digest()[:8],'big')
    return bounds['min']+value%(bounds['max']-bounds['min']+1)
