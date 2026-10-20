document.addEventListener('play', e => {
  document.querySelectorAll('audio').forEach(a => { if(a!==e.target) a.pause(); });
}, true);
let packet;
fetch('packet.json').then(r => { if(!r.ok) throw Error('Packet unavailable'); return r.json(); }).then(p => {
  packet=p; document.querySelector('button').disabled=false;
  document.getElementById('status').textContent='Packet ready. Ratings stay on this device.';
}).catch(() => { document.getElementById('status').textContent='Packet unavailable; reload before rating.'; });
document.querySelector('form').onsubmit = e => {
  e.preventDefault();
  if(!packet) return;
  // Match the importer: heard candidates need six scores; notes alone are valid.
  for(const fieldset of e.target.querySelectorAll('fieldset')) {
    const scores = [...fieldset.querySelectorAll('select')];
    const missing = scores.find(s => !s.value);
    if(missing && scores.some(s => s.value)) {
      document.getElementById('status').textContent='Complete all six ratings for this candidate, or clear them all. Notes can stand alone.';
      missing.focus();
      return;
    }
  }
  const ratings = Object.fromEntries(new FormData(e.target));
  const url = URL.createObjectURL(new Blob([JSON.stringify({schema_version:'1.0-q0-listening',packet_id:packet.packet_id,ratings},null,2)],{type:'application/json'}));
  const a=document.createElement('a');a.href=url;a.download='jamloom-q0-ratings.json';a.click();
  setTimeout(()=>URL.revokeObjectURL(url),1000);
  document.getElementById('status').textContent='Ratings downloaded locally. Nothing uploaded.';
};
