# Diagnostic overlay; canonical main retains the complete rebuild recipe.
FROM ghcr.io/sariserhan/jamloom/music-worker@sha256:acca37c030f1926915b37dc8ac7e7e9a6121935c71cac8faedf9c539b7853246
COPY services/runpod/handler.py ./services/runpod/
RUN python -m py_compile services/runpod/handler.py
