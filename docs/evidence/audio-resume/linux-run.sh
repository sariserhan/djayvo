#!/bin/sh
# Existing isolated VM/image; only the already-consented test phrase, no network or credentials.
set -eu
cd "$(dirname "$0")/../../.."
out=$(mktemp -d "$PWD/renders/audio-resume-linux-XXXXXX")
mkdir -p "$out/voice-20261017-221411"
cp renders/voice-20261017-221411/source-pcm.wav "$out/voice-20261017-221411/"
name="djayvo-$(basename "$out")"
started=false
cleanup() {
  docker --context colima-djayvo rm -f "$name" > "$out/cleanup.log" 2>&1 || true
  if [ "$started" = true ]; then colima stop djayvo >> "$out/cleanup.log" 2>&1; fi
  docker context show >> "$out/cleanup.log"
}
trap cleanup EXIT
if ! colima status djayvo > "$out/initial-vm.log" 2>&1; then
  started=true
  colima start djayvo --activate=false > "$out/vm-start.log" 2>&1
fi
docker --context colima-djayvo run --detach --init --name "$name" --network none --memory 2g --shm-size 1g \
  --workdir /work --env PULSE_SERVER=unix:/tmp/djayvo-pulse \
  -v "$PWD/apps/web:/work/apps/web:ro" -v "$PWD/dist/web:/work/dist/web:ro" \
  -v "$PWD/scripts/service-worker.js:/work/scripts/service-worker.js:ro" \
  -v "$PWD/scripts/build_offline.py:/work/scripts/build_offline.py:ro" \
  -v "$out:/work/renders:rw" djayvo-browser-audio:1.61.1 sleep infinity > "$out/container-id.txt"
docker --context colima-djayvo exec "$name" pulseaudio --daemonize=yes --exit-idle-time=-1 -n \
  --log-target=file:/tmp/djayvo-pulse.log \
  --load='module-native-protocol-unix socket=/tmp/djayvo-pulse auth-anonymous=1' \
  --load='module-null-sink sink_name=djayvo rate=48000 channels=2'
docker --context colima-djayvo exec "$name" sh -c 'uname -a; node --version; pulseaudio --version; cat /etc/os-release' > "$out/environment.txt"
docker --context colima-djayvo exec "$name" node --test 'apps/web/tests/*.test.js' > "$out/unit.log" 2>&1
media_test_exit=0
for browser in chromium webkit; do
  for suite in dj session; do
    if docker --context colima-djayvo exec -e DJAYVO_BROWSER="$browser" "$name" node "apps/web/tests/$suite.mjs" > "$out/$browser-$suite.log" 2>&1; then
      echo "$browser $suite completed (see report for capability gates)"
    else
      echo "$browser $suite FAIL (see $out/$browser-$suite.log)"
      media_test_exit=1
    fi
  done
done
docker --context colima-djayvo exec "$name" cat /sys/fs/cgroup/memory.events > "$out/memory-events.txt"
docker --context colima-djayvo exec "$name" cat /sys/fs/cgroup/memory.peak > "$out/memory-peak.txt"
echo "Artifacts: $out"
exit "$media_test_exit"
