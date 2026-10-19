"""Run from repository root with the project's analysis environment."""
import copy
import json
from pathlib import Path
import jsonschema

validator = jsonschema.Draft202012Validator(json.loads(Path('schemas/remix-plan.schema.json').read_text()))
validator.check_schema(validator.schema)
checks = 0
for path in sorted(Path('renders/session-modes-mac-20261018').glob('*.score.json')):
    score = json.loads(path.read_text())
    validator.validate(score)
    checks += 1
    if score['key']['mode'] == 'major':
        for version in range(7):
            bad = copy.deepcopy(score)
            bad['schema_version'] = f'1.{version}-remix'
            assert list(validator.iter_errors(bad)), 'major mode accepted with a legacy schema version'
            checks += 1
        bad = copy.deepcopy(score)
        bad['key']['mode'] = 'dorian'
        assert list(validator.iter_errors(bad)), 'unsupported mode accepted'
        checks += 1
print(json.dumps({'status': 'PASS', 'checks': checks, 'schema': 'draft 2020-12', 'harmony': 'Native validator, not JSON Schema, checks pitches against the mode.'}, indent=2))
