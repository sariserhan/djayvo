#!/bin/sh
set -eu
cd "$(dirname "$0")/../../.."
# Uses the already prepared project VM/container; preserves the default context.
colima start djayvo --activate=false
docker --context colima-djayvo start djayvo-portability
docker --context colima-djayvo exec djayvo-portability sh -eu -c '
  mkdir -p /work/interpolation-before-include/djayvo /out/interpolation-cache-20261019
  cp /src/renders/interpolation-cache-20261019/audio-before.h /work/interpolation-before-include/djayvo/audio.h
  c++ -std=c++17 -O2 -Wall -Wextra -Wpedantic -I /work/interpolation-before-include -I /src/core/include \
    /src/docs/evidence/interpolation-cache/probe.cpp /work/active-vocals-20261019/libdjayvo_core.a \
    -o /out/interpolation-cache-20261019/probe-before
  cmake -S /src -B /work/interpolation-cache-20261019 -DCMAKE_BUILD_TYPE=Release
  cmake --build /work/interpolation-cache-20261019 -j 2
  ctest --test-dir /work/interpolation-cache-20261019 --output-on-failure
  c++ -std=c++17 -O2 -Wall -Wextra -Wpedantic -I /src/core/include \
    /src/docs/evidence/interpolation-cache/probe.cpp /work/interpolation-cache-20261019/libdjayvo_core.a \
    -o /out/interpolation-cache-20261019/probe-after
  for trial in 1 2 3; do
    for stage in before after; do
      /out/interpolation-cache-20261019/probe-$stage /out/interpolation-cache-20261019/linux-$stage-$trial
    done
  done
  python3 /src/docs/evidence/interpolation-cache/replay.py /work/interpolation-cache-20261019/djayvo_remix \
    /out/interpolation-cache-20261019/replay
  uname -a
  c++ --version
  cmake --version
'
# Leave the VM up only for the following isolated browser validation; stop afterward.
