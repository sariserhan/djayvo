#!/bin/sh
set -eu
cd "$(dirname "$0")/../../.."
# This evidence profile normally uses 3 GiB and is stopped between runs.
if colima status djayvo >/dev/null 2>&1; then
  echo "Stop the isolated djayvo VM before running this capacity check." >&2
  exit 1
fi
out=$(mktemp -d "$PWD/renders/media-ready-linux-XXXXXX")
folder="$out"
name="djayvo-$(basename "$out")"
cleanup() {
  docker --context colima-djayvo rm -f "$name" > "$folder/cleanup.log" 2>&1 || true
  colima stop djayvo >> "$folder/cleanup.log" 2>&1
  colima start djayvo --memory 3 --activate=false >> "$folder/cleanup.log" 2>&1
  colima stop djayvo >> "$folder/cleanup.log" 2>&1
  docker context show >> "$folder/cleanup.log"
}
trap cleanup EXIT
colima start djayvo --memory 4 --activate=false > "$folder/final-vm.log" 2>&1
docker --context colima-djayvo run --detach --init --name "$name" --network none --memory 3g --shm-size 1g --workdir /work --env PULSE_SERVER=unix:/tmp/djayvo-pulse -v "$PWD/apps/web:/work/apps/web:ro" -v "$PWD/dist/web:/work/dist/web:ro" -v "$PWD/scripts/service-worker.js:/work/scripts/service-worker.js:ro" -v "$PWD/scripts/build_offline.py:/work/scripts/build_offline.py:ro" -v "$out:/work/renders:rw" djayvo-browser-audio:1.61.1 sleep infinity > "$out/container-id.txt"
docker --context colima-djayvo exec "$name" pulseaudio --daemonize=yes --exit-idle-time=-1 -n --log-target=file:/tmp/djayvo-pulse.log --load='module-native-protocol-unix socket=/tmp/djayvo-pulse auth-anonymous=1' --load='module-null-sink sink_name=djayvo rate=48000 channels=2'
docker --context colima-djayvo exec "$name" node --test 'apps/web/tests/*.test.js' > "$folder/unit-linux.log" 2>&1
result=0
for browser in webkit chromium; do
  if ! docker --context colima-djayvo exec -e DJAYVO_BROWSER="$browser" "$name" timeout -k 5 240 node apps/web/tests/dj.mjs > "$folder/linux-$browser.log" 2>&1; then result=1; fi
  docker --context colima-djayvo exec "$name" cat /sys/fs/cgroup/memory.events > "$folder/linux-$browser-memory.txt"
  docker --context colima-djayvo exec "$name" cat /sys/fs/cgroup/memory.peak > "$folder/linux-$browser-peak.txt"
done
printf 'Artifacts: %s\nExit: %s\n' "$out" "$result"
exit "$result"
