"""Read-only inventory of known local artifacts; not training admission or quality review.

Run from any directory with Python 3. Output goes to stdout; retained private
artifacts must exist. Does not inspect unrelated recordings or load model code.
"""
import hashlib
import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[3]


def digest(path):
    with path.open('rb') as source:
        return hashlib.file_digest(source, 'sha256').hexdigest()


def verify_hash(path, expected):
    actual = digest(path)
    if actual != expected:
        raise ValueError(f'Artifact hash mismatch: {path.relative_to(ROOT)}')
    return actual


def audit():
    curriculum = ROOT / 'docs/musician-training-curriculum.md'
    assignments = re.findall(r'^\| ([RHCIDPEJ][0-9]{2}) \|', curriculum.read_text(), re.M)
    expected = {f'{family}{index:02}' for family in 'RHCIDPEJ' for index in range(1, 7)}
    if len(assignments) != len(expected) or set(assignments) != expected:
        raise ValueError('Missing or duplicate curriculum assignment')
    clips_root = ROOT / 'renders/blood-training-20261019/train-input'
    clips = json.loads((clips_root / 'manifest.json').read_text())
    if len(clips) != 16:
        raise ValueError('Unexpected historical training manifest')
    for clip in clips:
        if Path(clip['file']).name != clip['file'] or clip['split'] != 'train':
            raise ValueError('Unexpected clip identity or split')
        verify_hash(clips_root / clip['file'], clip['sha256'])
    checkpoints = json.loads((ROOT / 'docs/evidence/blood-training/checkpoints.json').read_text())
    adapters = []
    for checkpoint in checkpoints:
        name = Path(checkpoint['path']).name
        path = ROOT / 'renders/blood-training-20261019/results/adapter/checkpoints' / name / 'adapter_model.safetensors'
        adapters.append({'step': checkpoint['step'], 'sha256': verify_hash(path, checkpoint['sha256'])})
    examples_path = ROOT / 'renders/r1-final-demonstration/examples.jsonl'
    rows = [json.loads(line) for line in examples_path.read_text().splitlines()]
    return {
        'scope': 'Known retained artifacts only; no discovery of private user libraries',
        'artifact_integrity': 'PASS', 'curriculum_assignments': len(assignments),
        'curriculum_sha256': digest(curriculum), 'verified_audio_clips': len(clips),
        'audio_session_groups': len({clip['session_group'] for clip in clips}),
        'audio_human_review': sorted({clip['human_content_review'] for clip in clips}),
        'verified_existing_adapters': adapters, 'demonstration_rows': len(rows),
        'demonstration_sha256': digest(examples_path),
        'demonstration_supervision': sorted({row['supervision'] for row in rows}),
        'demonstration_review': sorted({row['human_review'] for row in rows}),
        'demonstration_declared_training_rows': sum(row['training_authorized'] is True for row in rows),
        'training_admission': 'NOT RUN', 'new_optimizer_steps': 0,
        'new_model_training': 'NOT RUN', 'human_quality': 'NOT RUN',
    }


if __name__ == '__main__':
    print(json.dumps(audit(), indent=2))
