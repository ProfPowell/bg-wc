#!/usr/bin/env bash
# Regenerate the per-preset visual baselines inside the pinned Playwright
# container, so they match the CI `visual` job byte-for-byte. Run from repo root
# after a visual change: `bash scripts/update-visual-baselines.sh`.
#
# An anonymous volume shadows node_modules so the container's Linux install never
# clobbers the host's. Baselines land in test/visual.spec.js-snapshots/ on the host.
#
# Pinned to linux/amd64 so SwiftShader renders the same as the x86_64 CI runner
# (arm64 hosts otherwise produce subtly different pixels). On Apple Silicon this
# runs under emulation — slow, but matches CI.
set -euo pipefail
IMAGE="mcr.microsoft.com/playwright:v1.60.0-jammy"
docker run --rm --ipc=host --platform=linux/amd64 \
  -v "$PWD:/work" -v /work/node_modules \
  -w /work "$IMAGE" \
  bash -lc "npm ci --no-audit --no-fund && npx playwright test --project=visual --update-snapshots"
