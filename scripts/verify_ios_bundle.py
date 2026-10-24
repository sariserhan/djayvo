#!/usr/bin/env python3
"""Check the built iOS Release bundle, not App Store acceptance."""
import argparse
import hashlib
import json
from pathlib import Path
import plistlib


def verify(bundle):
    info = plistlib.loads((bundle / 'Info.plist').read_bytes())
    privacy = plistlib.loads((bundle / 'PrivacyInfo.xcprivacy').read_bytes())
    assert info['CFBundleName'] == 'Jamloom'
    assert info['NSMicrophoneUsageDescription']
    assert info['NSAppleMusicUsageDescription']
    assert not info.get('UIBackgroundModes'), 'Unexpected background capture entitlement'
    assert not info.get('UIFileSharingEnabled'), 'Private source library must not be exposed'
    assert privacy['NSPrivacyTracking'] is False
    assert privacy['NSPrivacyTrackingDomains'] == []
    collected = privacy['NSPrivacyCollectedDataTypes']
    assert {row['NSPrivacyCollectedDataType'] for row in collected} == {
        'NSPrivacyCollectedDataTypeEmailAddress', 'NSPrivacyCollectedDataTypeUserID',
        'NSPrivacyCollectedDataTypeOtherUserContent', 'NSPrivacyCollectedDataTypePurchaseHistory',
        'NSPrivacyCollectedDataTypeAudioData'}
    assert all(row['NSPrivacyCollectedDataTypeLinked'] is True and
               row['NSPrivacyCollectedDataTypeTracking'] is False and
               row['NSPrivacyCollectedDataTypePurposes'] == ['NSPrivacyCollectedDataTypePurposeAppFunctionality']
               for row in collected)
    reasons = {row['NSPrivacyAccessedAPIType']: set(row['NSPrivacyAccessedAPITypeReasons'])
               for row in privacy['NSPrivacyAccessedAPITypes']}
    assert reasons['NSPrivacyAccessedAPICategorySystemBootTime'] == {'35F9.1'}
    assert reasons['NSPrivacyAccessedAPICategoryFileTimestamp'] == {'C617.1', '3B52.1'}
    assert reasons['NSPrivacyAccessedAPICategoryUserDefaults'] == {'CA92.1'}
    assert not list(bundle.rglob('*.storekit')), 'Local StoreKit fixture found in Release'
    assert not list(bundle.rglob('*.wav')), 'Test/private audio found in Release'
    assert not list(bundle.rglob('*.m4a'))
    repo = Path(__file__).resolve().parents[1]
    tracks = json.loads((repo / 'apps/web/practice-audio/manifest.json').read_text())['tracks']
    expected_audio = {bundle / 'Studio' / row['url'].removeprefix('./'): row['sha256'] for row in tracks}
    assert set(bundle.rglob('*.mp3')) == set(expected_audio), 'Unexpected or missing practice audio'
    for audio, digest in expected_audio.items():
        assert hashlib.sha256(audio.read_bytes()).hexdigest() == digest, 'Practice audio mismatch'
    from verify_web_bundle import verify as verify_web
    verify_web()
    expected_studio = repo / 'build-ios-studio/Studio'
    actual = {str(p.relative_to(bundle / 'Studio')): hashlib.sha256(p.read_bytes()).hexdigest()
              for p in (bundle / 'Studio').rglob('*') if p.is_file()}
    expected = {str(p.relative_to(expected_studio)): hashlib.sha256(p.read_bytes()).hexdigest()
                for p in expected_studio.rglob('*') if p.is_file()}
    assert actual == expected and expected, 'Native studio bundle mismatch'
    assert not any(p.is_symlink() for p in (bundle / 'Studio').rglob('*')), 'Studio symlink'
    assert (bundle / 'dna-languages.json').read_bytes() == (repo / 'assets/manifests/dna-languages.json').read_bytes(), 'Music DNA language mismatch'
    executable = bundle / info['CFBundleExecutable']
    binary = executable.read_bytes()
    assert b'--ui-testing' not in binary and b'JAMLOOM_UI_TEST_LIBRARY' not in binary, 'Debug control found in Release'
    assert b'synthetic-speech' not in binary, 'Fixture reference found in Release'
    repo = Path(__file__).resolve().parents[1]
    for notice in (repo / 'assets/licenses').glob('*.txt'):
        assert (bundle / 'licenses' / notice.name).read_bytes() == notice.read_bytes()
    assert (bundle / 'manifest.json').read_bytes() == (repo / 'apps/web/practice-audio/manifest.json').read_bytes(), 'Catalogue metadata mismatch'
    assert (bundle / 'improvise-styles.json').read_bytes() == (repo / 'assets/manifests/improvise-styles.json').read_bytes(), 'Improvise style mismatch'
    assert (bundle / 'Assets.car').is_file(), 'App icon missing'
    return {'gate': 'PASS', 'bundle_identifier': info['CFBundleIdentifier'],
            'version': info['CFBundleShortVersionString'], 'build': info['CFBundleVersion'],
            'minimum_os': info['MinimumOSVersion'],
            'binary_sha256': hashlib.sha256(binary).hexdigest(),
            'bundle_bytes': sum(p.stat().st_size for p in bundle.rglob('*') if p.is_file()),
            'private_audio_and_debug_controls_absent': 'PASS', 'license_notices': 'PASS',
            'privacy_manifest': 'PASS', 'app_store_approval': 'NOT RUN',
            'scope': 'Static bundle checks; signing, physical behavior and compliance require separate evidence.'}


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('bundle', type=Path)
    args = parser.parse_args()
    try:
        print(json.dumps(verify(args.bundle), indent=2))
    except (AssertionError, KeyError, OSError, ValueError) as error:
        raise SystemExit('FAIL: ' + str(error))
