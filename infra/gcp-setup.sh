#!/usr/bin/env bash
# One-time, idempotent GCP + GitHub setup for deploying Averis to Cloud Run.
# Re-running it is safe: every step checks before it creates.
set -euo pipefail

PROJECT_ID=muba-m1ku
REGION=asia-southeast1
REPO=Averis-T010NG/Averis
AR_REPO=averis
BUCKET=muba-m1ku-averis-docs
POOL=github-averis
PROVIDER=github
DEPLOY_SA=averis-deployer
RUNTIME_SA=averis-runtime
BUDGET_NAME=averis-monthly
BUDGET_AMOUNT=30MYR

PROJECT_NUMBER=$(gcloud projects describe "$PROJECT_ID" --format='value(projectNumber)')
BILLING_ACCOUNT=$(gcloud billing projects describe "$PROJECT_ID" \
  --format='value(billingAccountName)' | sed 's|billingAccounts/||')
DEPLOY_EMAIL="$DEPLOY_SA@$PROJECT_ID.iam.gserviceaccount.com"
RUNTIME_EMAIL="$RUNTIME_SA@$PROJECT_ID.iam.gserviceaccount.com"
g() { gcloud --project "$PROJECT_ID" --quiet "$@"; }

echo "==> APIs"
g services enable run.googleapis.com artifactregistry.googleapis.com \
  iam.googleapis.com iamcredentials.googleapis.com sts.googleapis.com \
  secretmanager.googleapis.com storage.googleapis.com \
  cloudresourcemanager.googleapis.com billingbudgets.googleapis.com

echo "==> Artifact Registry"
g artifacts repositories describe "$AR_REPO" --location "$REGION" >/dev/null 2>&1 ||
  g artifacts repositories create "$AR_REPO" --location "$REGION" \
    --repository-format docker --description "Averis container images"
# Keep only the 5 newest images so storage stays inside the free 0.5 GiB.
cat >/tmp/averis-ar-cleanup.json <<'JSON'
[{"name":"keep-5","action":{"type":"Keep"},"mostRecentVersions":{"keepCount":5}},
 {"name":"delete-old","action":{"type":"Delete"},"condition":{"olderThan":"1d"}}]
JSON
g artifacts repositories set-cleanup-policies "$AR_REPO" --location "$REGION" \
  --policy /tmp/averis-ar-cleanup.json --no-dry-run >/dev/null

echo "==> Bucket"
g storage buckets describe "gs://$BUCKET" >/dev/null 2>&1 ||
  g storage buckets create "gs://$BUCKET" --location "$REGION" \
    --uniform-bucket-level-access --public-access-prevention

echo "==> Service accounts"
for sa in "$DEPLOY_SA" "$RUNTIME_SA"; do
  g iam service-accounts describe "$sa@$PROJECT_ID.iam.gserviceaccount.com" >/dev/null 2>&1 ||
    g iam service-accounts create "$sa" --display-name "Averis $sa"
done

echo "==> Deployer roles"
for role in roles/run.admin roles/secretmanager.admin; do
  g projects add-iam-policy-binding "$PROJECT_ID" --condition=None \
    --member "serviceAccount:$DEPLOY_EMAIL" --role "$role" >/dev/null
done
g artifacts repositories add-iam-policy-binding "$AR_REPO" --location "$REGION" \
  --member "serviceAccount:$DEPLOY_EMAIL" --role roles/artifactregistry.writer >/dev/null
g iam service-accounts add-iam-policy-binding "$RUNTIME_EMAIL" \
  --member "serviceAccount:$DEPLOY_EMAIL" --role roles/iam.serviceAccountUser >/dev/null

echo "==> Runtime roles"
# Read only the averis-* secrets, not other projects' secrets in this project.
g projects add-iam-policy-binding "$PROJECT_ID" \
  --member "serviceAccount:$RUNTIME_EMAIL" --role roles/secretmanager.secretAccessor \
  --condition "expression=resource.name.startsWith(\"projects/$PROJECT_NUMBER/secrets/averis-\"),title=averis-secrets-only" \
  >/dev/null
g storage buckets add-iam-policy-binding "gs://$BUCKET" \
  --member "serviceAccount:$RUNTIME_EMAIL" --role roles/storage.objectAdmin >/dev/null

echo "==> Workload Identity Federation"
g iam workload-identity-pools describe "$POOL" --location global >/dev/null 2>&1 ||
  g iam workload-identity-pools create "$POOL" --location global \
    --display-name "GitHub Averis"
g iam workload-identity-pools providers describe "$PROVIDER" --location global \
  --workload-identity-pool "$POOL" >/dev/null 2>&1 ||
  g iam workload-identity-pools providers create-oidc "$PROVIDER" --location global \
    --workload-identity-pool "$POOL" --display-name "GitHub Actions" \
    --issuer-uri "https://token.actions.githubusercontent.com" \
    --attribute-mapping "google.subject=assertion.sub,attribute.repository=assertion.repository,attribute.ref=assertion.ref" \
    --attribute-condition "assertion.repository=='$REPO' && assertion.ref=='refs/heads/main'"
POOL_ID="projects/$PROJECT_NUMBER/locations/global/workloadIdentityPools/$POOL"
g iam service-accounts add-iam-policy-binding "$DEPLOY_EMAIL" \
  --role roles/iam.workloadIdentityUser \
  --member "principalSet://iam.googleapis.com/$POOL_ID/attribute.repository/$REPO" >/dev/null

echo "==> Budget alert ($BUDGET_AMOUNT/month, whole project)"
if ! gcloud billing budgets list --billing-account "$BILLING_ACCOUNT" \
  --format='value(displayName)' | grep -qx "$BUDGET_NAME"; then
  gcloud billing budgets create --billing-account "$BILLING_ACCOUNT" \
    --display-name "$BUDGET_NAME" --budget-amount "$BUDGET_AMOUNT" \
    --filter-projects "projects/$PROJECT_ID" \
    --threshold-rule percent=0.5 --threshold-rule percent=0.9 \
    --threshold-rule percent=1.0
fi

echo "==> GitHub repo variables"
gh variable set GCP_PROJECT_ID --repo "$REPO" --body "$PROJECT_ID"
gh variable set GCP_REGION --repo "$REPO" --body "$REGION"
gh variable set WIF_PROVIDER --repo "$REPO" --body "$POOL_ID/providers/$PROVIDER"
gh variable set DEPLOY_SA --repo "$REPO" --body "$DEPLOY_EMAIL"
gh variable set RUNTIME_SA --repo "$REPO" --body "$RUNTIME_EMAIL"
gh variable set GCS_BUCKET --repo "$REPO" --body "$BUCKET"

echo "Done. Add API keys with: gh secret set GEMINI_API_KEY --repo $REPO"
