#!/usr/bin/env bash
# Regenerate the per-preset visual baselines inside the pinned Playwright
# container, so they match the CI `visual` job byte-for-byte. Run from repo root
# after a visual change: `bash scripts/update-visual-baselines.sh`.
#
# An anonymous volume shadows node_modules so the container's Linux install never
# clobbers the host's. Baselines land in test/visual.spec.js-snapshots/ on the host.
set -euo pipefail
IMAGE="mcr.microsoft.com/playwright:v1.60.0-jammy"
docker run --rm --ipc=host \
  -v "$PWD:/work" -v /work/node_modules \
  -w /work "$IMAGE" \
  bash -lc "npm ci --no-audit --no-fund && npx playwright test --project=visual --update-snapshots"
