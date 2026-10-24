# Release overlay on the qualified runtime; canonical main retains the complete rebuild recipe.
FROM ghcr.io/sariserhan/jamloom/music-worker@sha256:83a00c568cb48f24e27811c901ac941643aee3352f2a0239c5b071120af58780
COPY scripts/singing_response.py scripts/singer_studio.py scripts/local_call_edit.py ./scripts/
RUN python -m py_compile scripts/singing_response.py scripts/singer_studio.py scripts/local_call_edit.py
