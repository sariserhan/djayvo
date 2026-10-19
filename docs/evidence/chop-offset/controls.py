"""Create fresh PCM16 pause controls; never replace inputs or the speech fixture."""
from pathlib import Path
import math
import struct
import wave

folder = Path('renders/chop-offset-20261019/controls')
folder.mkdir(exist_ok=False)
rate = 48000
for kind, end in [('short', 22560), ('long', 38400)]:
    for name, offset in [('flat', 0), ('positive', 8192), ('negative', -8192)]:
        samples = [round(.3*32768*math.sin(2*math.pi*200*i/rate))
                   if 4800 <= i < end and not 14400 <= i < 14880 else 0
                   for i in range(rate*3)]
        samples = [x+offset for x in samples]
        assert max(samples) < 32768 and min(samples) >= -32768
        with wave.open(str(folder/f'{kind}-{name}.wav'), 'wb') as f:
            f.setparams((1, 2, rate, len(samples), 'NONE', 'not compressed'))
            f.writeframes(struct.pack(f'<{len(samples)}h', *samples))
print('PASS: six fresh controls with exact integer offsets, 10 ms internal gap and known ending')
