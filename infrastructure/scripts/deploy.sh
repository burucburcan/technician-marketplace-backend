#!/bin/bash

# Deployment script for Technician Marketplace Platform
# Usage: ./deploy.sh [staging|production] [version]

set -e

ENVIRONMENT=${1:-staging}
VERSION=${2:-latest}
NAMESPACE=$ENVIRONMENT

echo "========================================="
echo "Deploying to: $ENVIRONMENT"
echo "Version: $VERSION"
echo "========================================="

# Validate environment
if [[ "$ENVIRONMENT" != "staging" && "$ENVIRONMENT" != "production" ]]; then
    echo "Error: Environment must be 'staging' or 'production'"
    exit 1
fi

# Check if kubectl is configured
if ! kubectl cluster-info &> /dev/null; then
    echo "Error: kubectl is not configured or cluster is not accessible"
    exit 1
fi

# Check if namespace exists
if ! kubectl get namespace $NAMESPACE &> /dev/null; then
    echo "Creating namespace: $NAMESPACE"
    kubectl create namespace $NAMESPACE
fi

# Apply ConfigMaps and Secrets
echo "Applying ConfigMaps and Secrets..."
kubectl apply -f infrastructure/kubernetes/configmap.yaml -n $NAMESPACE
kubectl apply -f infrastructure/kubernetes/secrets.yaml -n $NAMESPACE

# Apply database migrations
echo "Running database migrations..."
kubectl apply -f infrastructure/kubernetes/migration-job.yaml -n $NAMESPACE
kubectl wait --for=condition=complete --timeout=300s job/migration-job -n $NAMESPACE

# Deploy backend
echo "Deploying backend service..."
kubectl apply -f infrastructure/kubernetes/backend-deployment.yaml -n $NAMESPACE
kubectl rollout status deployment/backend -n $NAMESPACE --timeout=300s

# Deploy web frontend
echo "Deploying web frontend..."
kubectl apply -f infrastructure/kubernetes/web-frontend-deployment.yaml -n $NAMESPACE
kubectl rollout status deployment/web-frontend -n $NAMESPACE --timeout=300s

# Apply ingress
echo "Applying ingress configuration..."
kubectl apply -f infrastructure/kubernetes/ingress.yaml -n $NAMESPACE

# Run smoke tests
echo "Running smoke tests..."
sleep 30  # Wait for services to stabilize

BACKEND_URL="https://api.technician-marketplace.com"
if [[ "$ENVIRONMENT" == "staging" ]]; then
    BACKEND_URL="https://staging-api.technician-marketplace.com"
fi

# Health check
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" $BACKEND_URL/health)
if [[ "$HTTP_CODE" != "200" ]]; then
    echo "Error: Health check failed with HTTP code $HTTP_CODE"
    exit 1
fi

echo "Health check passed!"

# Display deployment info
echo ""
echo "========================================="
echo "Deployment completed successfully!"
echo "========================================="
echo "Environment: $ENVIRONMENT"
echo "Version: $VERSION"
echo "Backend URL: $BACKEND_URL"
echo ""
echo "Deployment details:"
kubectl get deployments -n $NAMESPACE
echo ""
echo "Service details:"
kubectl get services -n $NAMESPACE
echo ""
echo "Pod status:"
kubectl get pods -n $NAMESPACE

# Tag deployment in monitoring
if [[ -n "$SENTRY_AUTH_TOKEN" ]]; then
    echo "Creating Sentry release..."
    curl -sX POST \
        https://sentry.io/api/0/organizations/technician-marketplace/releases/ \
        -H "Authorization: Bearer $SENTRY_AUTH_TOKEN" \
        -H 'Content-Type: application/json' \
        -d "{
            \"version\": \"$VERSION\",
            \"projects\": [\"backend\"],
            \"environment\": \"$ENVIRONMENT\"
        }"
fi

echo ""
echo "Deployment script completed!"
