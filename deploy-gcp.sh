#!/bin/bash

# Configuration
PROJECT_ID="prompt-wars-prem-16022026"
SERVICE_NAME="hyperspace-cadet-ai"
REGION="us-west1"

# Check if .env.local exists and load variables
if [ -f .env.local ]; then
    echo "Loading environment variables from .env.local..."
    set -a
    source .env.local
    set +a
else
    echo "Error: .env.local file not found!"
    exit 1
fi

if [ -z "$VITE_GEMINI_API_KEY" ]; then
    echo "Error: VITE_GEMINI_API_KEY is not set in .env.local"
    exit 1
fi

echo "🚀 Deploying strictly to Google Cloud Project: $PROJECT_ID"
echo "Service Name: $SERVICE_NAME"
echo "Region: $REGION"

# Ensure gcloud is installed
if ! command -v gcloud &> /dev/null; then
    echo "Error: gcloud CLI is not installed. Please install Google Cloud SDK."
    exit 1
fi

# Set the project
gcloud config set project $PROJECT_ID

# Enable required services
echo "Enable Cloud Build and Cloud Run services..."
gcloud services enable cloudbuild.googleapis.com run.googleapis.com

# Build the container image using Cloud Build
echo "🏗️  Building container image..."
gcloud builds submit --config cloudbuild.yaml \
    --substitutions _VITE_GEMINI_API_KEY="$VITE_GEMINI_API_KEY" \
    --project $PROJECT_ID

if [ $? -ne 0 ]; then
    echo "Build failed!"
    exit 1
fi

# Deploy to Cloud Run
echo "🚀 Deploying to Cloud Run..."
gcloud run deploy $SERVICE_NAME \
    --image gcr.io/$PROJECT_ID/hyperspace-cadet-ai \
    --platform managed \
    --region $REGION \
    --allow-unauthenticated \
    --project $PROJECT_ID

echo "✅ Deployment complete! Your app should be live."
