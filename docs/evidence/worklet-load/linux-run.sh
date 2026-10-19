#!/bin/sh
# Isolated existing Linux VM and cached browser image; no network or credentials.
set -eu
cd "$(dirname "$0")/../../.."
out=$(mktemp -d "$PWD/renders/worklet-linux-XXXXXX")
name="djayvo-worklet-$(basename "$out")"
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
mkdir "$out/live-deadline-20261019"
cp renders/live-deadline-20261019/mac-detailed.f32 renders/live-deadline-20261019/mac-detailed.tsv "$out/live-deadline-20261019/"
docker --context colima-djayvo image inspect djayvo-browser-audio:1.61.1 --format '{{.Id}}' > "$out/image-id.txt"
docker --context colima-djayvo run --detach --init --name "$name" --network none --memory 2g --shm-size 1g \
  --workdir /work --env PULSE_SERVER=unix:/tmp/djayvo-pulse \
  -v "$PWD/apps/web:/work/apps/web:ro" -v "$PWD/dist/web:/work/dist/web:ro" \
  -v "$out:/work/renders:rw" djayvo-browser-audio:1.61.1 sleep infinity > "$out/container-id.txt"
docker --context colima-djayvo exec "$name" pulseaudio --daemonize=yes --exit-idle-time=-1 -n \
  --log-target=file:/tmp/djayvo-pulse.log \
  --load='module-native-protocol-unix socket=/tmp/djayvo-pulse auth-anonymous=1' \
  --load='module-null-sink sink_name=djayvo rate=48000 channels=2'
docker --context colima-djayvo exec "$name" sh -c 'uname -a; node --version; pulseaudio --version; cat /etc/os-release' > "$out/environment.txt"
docker --context colima-djayvo exec "$name" node --test apps/web/tests/worklet-capture.test.js > "$out/unit.log" 2>&1
status=0
for browser in chromium webkit; do
  if docker --context colima-djayvo exec -e DJAYVO_BROWSER="$browser" "$name" node apps/web/tests/worklet-load.mjs > "$out/$browser.log" 2>&1; then
    echo "$browser PASS"
  else
    echo "$browser FAIL (see $out/$browser.log)"
    status=1
  fi
done
docker --context colima-djayvo exec "$name" cat /sys/fs/cgroup/memory.events > "$out/memory-events.txt"
docker --context colima-djayvo exec "$name" cat /sys/fs/cgroup/memory.peak > "$out/memory-peak.txt"
docker --context colima-djayvo exec "$name" cat /tmp/djayvo-pulse.log > "$out/pulse.log"
echo "Artifacts: $out"
exit "$status"
