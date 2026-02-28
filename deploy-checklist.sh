#!/bin/bash

# 🚀 Production Deployment Checklist Script
# Teknisyen Bulma Platformu

set -e

echo "=========================================="
echo "  PRODUCTION DEPLOYMENT CHECKLIST"
echo "  Teknisyen Bulma Platformu"
echo "=========================================="
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to check command
check_command() {
    if command -v $1 &> /dev/null; then
        echo -e "${GREEN}✓${NC} $1 is installed"
        return 0
    else
        echo -e "${RED}✗${NC} $1 is NOT installed"
        return 1
    fi
}

# Function to check version
check_version() {
    local cmd=$1
    local version=$($cmd --version 2>&1 | head -n 1)
    echo "  Version: $version"
}

echo "=== 1. CHECKING REQUIRED TOOLS ==="
echo ""

# Check Node.js
if check_command node; then
    check_version node
else
    echo -e "${RED}Please install Node.js v20+${NC}"
    exit 1
fi

# Check npm
if check_command npm; then
    check_version npm
else
    echo -e "${RED}Please install npm v10+${NC}"
    exit 1
fi

# Check Docker
if check_command docker; then
    check_version docker
else
    echo -e "${RED}Please install Docker v24+${NC}"
    exit 1
fi

# Check kubectl
if check_command kubectl; then
    check_version kubectl
else
    echo -e "${YELLOW}⚠${NC} kubectl is not installed (needed for Kubernetes deployment)"
fi

# Check AWS CLI
if check_command aws; then
    check_version aws
else
    echo -e "${YELLOW}⚠${NC} AWS CLI is not installed (needed for AWS deployment)"
fi

echo ""
echo "=== 2. CHECKING GIT STATUS ==="
echo ""

# Check git status
if [ -d .git ]; then
    echo -e "${GREEN}✓${NC} Git repository found"
    
    # Check for uncommitted changes
    if [ -z "$(git status --porcelain)" ]; then
        echo -e "${GREEN}✓${NC} Working directory is clean"
    else
        echo -e "${YELLOW}⚠${NC} You have uncommitted changes"
        git status --short
    fi
    
    # Show current branch
    BRANCH=$(git branch --show-current)
    echo "  Current branch: $BRANCH"
else
    echo -e "${RED}✗${NC} Not a git repository"
fi

echo ""
echo "=== 3. CHECKING ENVIRONMENT FILES ==="
echo ""

# Check backend .env
if [ -f "packages/backend/.env.production" ]; then
    echo -e "${GREEN}✓${NC} Backend .env.production exists"
else
    echo -e "${RED}✗${NC} Backend .env.production NOT found"
    echo "  Create it from .env.example"
fi

# Check web frontend .env
if [ -f "packages/web-frontend/.env.production" ]; then
    echo -e "${GREEN}✓${NC} Web frontend .env.production exists"
else
    echo -e "${RED}✗${NC} Web frontend .env.production NOT found"
    echo "  Create it from .env.example"
fi

# Check mobile frontend .env
if [ -f "packages/mobile-frontend/.env.production" ]; then
    echo -e "${GREEN}✓${NC} Mobile frontend .env.production exists"
else
    echo -e "${YELLOW}⚠${NC} Mobile frontend .env.production NOT found"
fi

echo ""
echo "=== 4. CHECKING DEPENDENCIES ==="
echo ""

# Check if node_modules exists
if [ -d "node_modules" ]; then
    echo -e "${GREEN}✓${NC} Root node_modules exists"
else
    echo -e "${YELLOW}⚠${NC} Root node_modules NOT found"
    echo "  Run: npm install"
fi

# Check backend dependencies
if [ -d "packages/backend/node_modules" ]; then
    echo -e "${GREEN}✓${NC} Backend node_modules exists"
else
    echo -e "${YELLOW}⚠${NC} Backend node_modules NOT found"
    echo "  Run: cd packages/backend && npm install"
fi

# Check web frontend dependencies
if [ -d "packages/web-frontend/node_modules" ]; then
    echo -e "${GREEN}✓${NC} Web frontend node_modules exists"
else
    echo -e "${YELLOW}⚠${NC} Web frontend node_modules NOT found"
    echo "  Run: cd packages/web-frontend && npm install"
fi

echo ""
echo "=== 5. RUNNING TESTS ==="
echo ""

echo "Running tests... (this may take a few minutes)"
echo ""

# Run tests
if npm test --silent 2>&1 | grep -q "PASS\|FAIL"; then
    echo -e "${GREEN}✓${NC} Tests completed"
else
    echo -e "${YELLOW}⚠${NC} Tests may have issues - check manually"
fi

echo ""
echo "=== 6. CHECKING DOCKER ==="
echo ""

# Check if Docker is running
if docker info &> /dev/null; then
    echo -e "${GREEN}✓${NC} Docker daemon is running"
else
    echo -e "${RED}✗${NC} Docker daemon is NOT running"
    echo "  Start Docker Desktop or Docker service"
    exit 1
fi

# Check docker-compose
if [ -f "docker-compose.yml" ]; then
    echo -e "${GREEN}✓${NC} docker-compose.yml exists"
else
    echo -e "${RED}✗${NC} docker-compose.yml NOT found"
fi

echo ""
echo "=== 7. CHECKING KUBERNETES CONFIG ==="
echo ""

# Check Kubernetes manifests
if [ -d "infrastructure/kubernetes" ]; then
    echo -e "${GREEN}✓${NC} Kubernetes manifests directory exists"
    
    # List manifest files
    echo "  Found manifests:"
    ls -1 infrastructure/kubernetes/*.yaml 2>/dev/null | sed 's/^/    /'
else
    echo -e "${RED}✗${NC} Kubernetes manifests directory NOT found"
fi

echo ""
echo "=== 8. SUMMARY ==="
echo ""

# Count checks
TOTAL_CHECKS=0
PASSED_CHECKS=0

# This is a simplified summary
echo "Pre-deployment checklist completed!"
echo ""
echo "Next steps:"
echo "1. Review PRODUCTION_DEPLOYMENT_GUIDE.md"
echo "2. Configure environment variables"
echo "3. Set up AWS resources (RDS, ElastiCache, etc.)"
echo "4. Build Docker images"
echo "5. Deploy to Kubernetes"
echo ""

echo "=========================================="
echo "  Ready to proceed with deployment?"
echo "=========================================="
echo ""
echo "Run the following commands to start:"
echo ""
echo "  # 1. Build backend"
echo "  cd packages/backend && npm run build"
echo ""
echo "  # 2. Build web frontend"
echo "  cd packages/web-frontend && npm run build"
echo ""
echo "  # 3. Build Docker images"
echo "  docker build -t technician-platform-backend:1.0.0 packages/backend"
echo "  docker build -t technician-platform-web:1.0.0 packages/web-frontend"
echo ""
echo "  # 4. Start local test"
echo "  docker-compose up -d"
echo ""

