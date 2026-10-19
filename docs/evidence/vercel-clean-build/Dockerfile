# Vercel documents Amazon Linux 2023 as its base; this is a local approximation.
FROM --platform=linux/amd64 amazonlinux:2023
RUN dnf install -y git make python3 python3-pip tar gzip xz findutils && dnf clean all
RUN curl -fsSLO https://nodejs.org/dist/v22.23.2/node-v22.23.2-linux-x64.tar.xz \
 && curl -fsSLO https://nodejs.org/dist/v22.23.2/SHASUMS256.txt \
 && grep ' node-v22.23.2-linux-x64.tar.xz$' SHASUMS256.txt | sha256sum -c - \
 && tar -xJf node-v22.23.2-linux-x64.tar.xz -C /usr/local --strip-components=1 \
 && rm node-v22.23.2-linux-x64.tar.xz SHASUMS256.txt
WORKDIR /work/apps/site
ENV NEXT_TELEMETRY_DISABLED=1
