"""Prepare dense valid vocal schedules from the retained synthetic fixture plan."""
from pathlib import Path
import copy
import json

folder = Path('renders/active-vocals-20261019/plans')
folder.mkdir(exist_ok=False)
base = json.loads(Path('renders/chop-offset-20261019/after/fixture.hiphop.score.json').read_text())
for name in ['sparse', 'dense', 'echo']:
    plan = copy.deepcopy(base)
    if name != 'sparse':
        plan['voice_clips'] = [base['voice_clips'][0]] + [
            {'id': i+1, 'start_frame': 12000+i*2400, 'end_frame': 12000+i*2400+size, 'confidence': .5}
            for i, size in enumerate([480, 1200, 2400, 4800])]
        plan['voice_events'] = [{'start_tick': 0, 'clip_id': 0, 'gain_db': -12,
                                 'rate': 1, 'reverse': False, 'pan': 0, 'clean': True}]
        for i in range(1023 if name == 'dense' else 255):
            event = {'start_tick': (i//15)*400 if name == 'dense' else 8000+i*90,
                     'clip_id': 1+i%4, 'gain_db': -24, 'rate': [0.5, 0.75, 1, 1.5, 2][i%5],
                     'reverse': bool(i%2), 'pan': (i%3-1)*.4, 'clean': False}
            if name == 'echo':
                event.update(echo_ticks=120, echo_gain_db=-12)
            plan['voice_events'].append(event)
        if name == 'echo':
            plan['schema_version'] = '1.2-remix'
    with (folder/f'{name}.json').open('x') as f:
        json.dump(plan, f, indent=2);f.write('\n')
print('Prepared sparse, 1024-event and 1021-trigger echo plans; native validation still required')
