FROM python:3.12-slim-bookworm@sha256:6a0e06f5ba0b373d051aabd3fffb9b873f27f9a2a3a14bcbe37dee6f0e3bbc70
ENV PYTHONUNBUFFERED=1 HF_HUB_DISABLE_TELEMETRY=1 TOKENIZERS_PARALLELISM=false \
    JAMLOOM_INFERENCE_DEVICE=cuda GRADIO_ANALYTICS_ENABLED=False
LABEL org.opencontainers.image.source="https://github.com/sariserhan/jamloom"
WORKDIR /opt/jamloom
RUN apt-get update && apt-get install -y --no-install-recommends ffmpeg libsndfile1 git ca-certificates build-essential \
    && rm -rf /var/lib/apt/lists/* && pip install --no-cache-dir uv==0.13.1 \
    && uv pip install --system runpod==1.12.0 && uv cache clean
RUN git init build-style-training/upstream \
    && cd build-style-training/upstream \
    && git remote add origin https://github.com/ace-step/ACE-Step-1.5.git \
    && git fetch --depth 1 origin ca1e85fe9430179831e6bc6be790c332190a3866 && git checkout FETCH_HEAD \
    && uv sync --frozen --no-dev --python 3.12 \
    && uv pip freeze | sed '/^-e /d' > /tmp/ace-constraints.txt \
    && uv pip install --constraint /tmp/ace-constraints.txt faster-whisper==1.2.1 && uv cache clean \
    && rm -rf acestep/third_parts/nano-vllm/build
# Explicit copies exclude credentials, recordings, research datasets and generated songs.
COPY scripts/singing_response.py scripts/music_dna_song.py scripts/dna_direction.py scripts/dna_language.py scripts/check_dna_audio.py scripts/singer_studio.py scripts/analyze_words.py scripts/arrange_voice_research.py scripts/assemble_sung_response.py scripts/local_call_edit.py scripts/source_led_response.py scripts/separate_singer.py ./scripts/
COPY assets/manifests/singing-model.json assets/manifests/lyric-planner-cuda.json assets/manifests/dna-auditor.json assets/manifests/dna-directions.json assets/manifests/dna-languages.json assets/manifests/singer-separation.json assets/manifests/word-timing-tiny.json ./assets/manifests/
COPY services/runpod/handler.py services/runpod/pipeline.py services/runpod/prepare_models.py ./services/runpod/
ENV PATH="/opt/jamloom/build-style-training/upstream/.venv/bin:$PATH"
RUN python services/runpod/prepare_models.py && mkdir -p renders \
    && python -c "import torch, transformers, faster_whisper; assert torch.__version__.startswith('2.10.0')" \
    && /usr/local/bin/python -c "import runpod" \
    && uv pip freeze --python /opt/jamloom/build-style-training/upstream/.venv/bin/python > services/runpod/packages.txt
ENV HF_HUB_OFFLINE=1 LOG_LEVEL=ERROR
CMD ["/usr/local/bin/python", "services/runpod/handler.py"]
