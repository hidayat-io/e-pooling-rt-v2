#!/usr/bin/env bash
set -euo pipefail

if [[ $# -lt 4 ]]; then
  echo "Usage: $0 <PROJECT_ID> <REGION> <CLOUD_RUN_URL> <INTERNAL_JOB_SECRET>"
  exit 1
fi

PROJECT_ID="$1"
REGION="$2"
CLOUD_RUN_URL="$3"
JOB_SECRET="$4"

gcloud config set project "${PROJECT_ID}"

gcloud scheduler jobs create http evoting-wa-queue \
  --location "${REGION}" \
  --schedule "*/1 * * * *" \
  --uri "${CLOUD_RUN_URL}/api/v1/internal/jobs/wa-queue" \
  --http-method POST \
  --headers "x-job-secret=${JOB_SECRET}" \
  || gcloud scheduler jobs update http evoting-wa-queue \
    --location "${REGION}" \
    --schedule "*/1 * * * *" \
    --uri "${CLOUD_RUN_URL}/api/v1/internal/jobs/wa-queue" \
    --http-method POST \
    --update-headers "x-job-secret=${JOB_SECRET}"

gcloud scheduler jobs create http evoting-token-cleanup \
  --location "${REGION}" \
  --schedule "0 2 * * *" \
  --uri "${CLOUD_RUN_URL}/api/v1/internal/jobs/token-cleanup" \
  --http-method POST \
  --headers "x-job-secret=${JOB_SECRET}" \
  || gcloud scheduler jobs update http evoting-token-cleanup \
    --location "${REGION}" \
    --schedule "0 2 * * *" \
    --uri "${CLOUD_RUN_URL}/api/v1/internal/jobs/token-cleanup" \
    --http-method POST \
    --update-headers "x-job-secret=${JOB_SECRET}"

echo "Scheduler jobs configured in ${REGION}"
