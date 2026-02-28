# Deployment Guide
## Technician Marketplace Platform

This guide provides comprehensive instructions for deploying the Technician Marketplace Platform to production.

---

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Infrastructure Setup](#infrastructure-setup)
3. [Configuration](#configuration)
4. [Deployment Process](#deployment-process)
5. [Monitoring Setup](#monitoring-setup)
6. [Backup Configuration](#backup-configuration)
7. [Troubleshooting](#troubleshooting)
8. [Rollback Procedures](#rollback-procedures)

---

## Prerequisites

### Required Tools

- **Docker** (v24.0+)
- **Kubernetes** (v1.28+)
- **kubectl** (v1.28+)
- **Helm** (v3.12+)
- **AWS CLI** (v2.0+)
- **Node.js** (v20.x)
- **npm** (v10.x)

### Access Requirements

- AWS account with appropriate permissions
- Kubernetes cluster access
- GitHub repository access
- Domain name and DNS management access
- SSL certificates (or Let's Encrypt access)

### Environment Variables

Create a `.env` file with the following variables:

```bash
# Application
NODE_ENV=production
PORT=3000
APP_VERSION=1.0.0

# Database
DATABASE_URL=postgresql://user:password@host:5432/technician_marketplace
REDIS_URL=redis://host:6379
MONGODB_URL=mongodb://user:password@host:27017/technician_marketplace
ELASTICSEARCH_URL=http://host:9200

# Authentication
JWT_SECRET=your-jwt-secret-here
JWT_EXPIRATION=24h

# AWS
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=your-access-key
AWS_SECRET_ACCESS_KEY=your-secret-key
AWS_S3_BUCKET=technician-marketplace-uploads

# External Services
SENDGRID_API_KEY=your-sendgrid-key
TWILIO_ACCOUNT_SID=your-twilio-sid
TWILIO_AUTH_TOKEN=your-twilio-token
STRIPE_SECRET_KEY=your-stripe-key
GOOGLE_MAPS_API_KEY=your-google-maps-key

# Monitoring
SENTRY_DSN=your-sentry-dsn
PROMETHEUS_ENABLED=true

# Backup
S3_BACKUP_BUCKET=technician-marketplace-backups
BACKUP_RETENTION_DAYS=30
```

---

## Infrastructure Setup

### 1. Kubernetes Cluster Setup

#### Option A: AWS EKS

```bash
# Create EKS cluster
eksctl create cluster \
  --name technician-marketplace \
  --region us-east-1 \
  --nodegroup-name standard-workers \
  --node-type t3.medium \
  --nodes 3 \
  --nodes-min 3 \
  --nodes-max 10 \
  --managed

# Configure kubectl
aws eks update-kubeconfig --name technician-marketplace --region us-east-1
```

#### Option B: Self-Managed Kubernetes

```bash
# Initialize cluster (on master node)
kubeadm init --pod-network-cidr=10.244.0.0/16

# Install network plugin (Calico)
kubectl apply -f https://docs.projectcalico.org/manifests/calico.yaml

# Join worker nodes
kubeadm join <master-ip>:6443 --token <token> --discovery-token-ca-cert-hash <hash>
```

### 2. Install Required Components

```bash
# Install Nginx Ingress Controller
kubectl apply -f https://raw.githubusercontent.com/kubernetes/ingress-nginx/controller-v1.8.2/deploy/static/provider/cloud/deploy.yaml

# Install cert-manager for SSL
kubectl apply -f https://github.com/cert-manager/cert-manager/releases/download/v1.13.0/cert-manager.yaml

# Install Metrics Server
kubectl apply -f https://github.com/kubernetes-sigs/metrics-server/releases/latest/download/components.yaml
```

### 3. Create Namespaces

```bash
kubectl create namespace production
kubectl create namespace staging
kubectl create namespace monitoring
```

---

## Configuration

### 1. Create Kubernetes Secrets

```bash
# Database credentials
kubectl create secret generic postgres-credentials \
  --from-literal=username=postgres \
  --from-literal=password=your-password \
  -n production

# Backend secrets
kubectl create secret generic backend-secrets \
  --from-literal=database-url=$DATABASE_URL \
  --from-literal=redis-url=$REDIS_URL \
  --from-literal=mongodb-url=$MONGODB_URL \
  --from-literal=elasticsearch-url=$ELASTICSEARCH_URL \
  --from-literal=jwt-secret=$JWT_SECRET \
  --from-literal=aws-access-key-id=$AWS_ACCESS_KEY_ID \
  --from-literal=aws-secret-access-key=$AWS_SECRET_ACCESS_KEY \
  --from-literal=sendgrid-api-key=$SENDGRID_API_KEY \
  --from-literal=stripe-secret-key=$STRIPE_SECRET_KEY \
  --from-literal=sentry-dsn=$SENTRY_DSN \
  -n production

# AWS credentials for backups
kubectl create secret generic aws-credentials \
  --from-literal=access-key-id=$AWS_ACCESS_KEY_ID \
  --from-literal=secret-access-key=$AWS_SECRET_ACCESS_KEY \
  -n production
```

### 2. Configure DNS

Point your domain to the load balancer:

```bash
# Get load balancer IP/hostname
kubectl get svc -n ingress-nginx

# Create DNS A/CNAME records:
# api.technician-marketplace.com -> Load Balancer IP
# technician-marketplace.com -> Load Balancer IP
```

### 3. SSL Certificate Setup

#### Option A: Let's Encrypt (Automated)

```bash
# Apply ClusterIssuer
kubectl apply -f infrastructure/kubernetes/ingress.yaml
```

#### Option B: Manual Certificate

```bash
# Create TLS secret
kubectl create secret tls technician-marketplace-tls \
  --cert=path/to/fullchain.pem \
  --key=path/to/privkey.pem \
  -n production
```

---

## Deployment Process

### 1. Build Docker Images

```bash
# Build backend image
docker build -t ghcr.io/technician-marketplace/backend:latest \
  -f packages/backend/Dockerfile .

# Build web frontend image
docker build -t ghcr.io/technician-marketplace/web-frontend:latest \
  -f packages/web-frontend/Dockerfile .

# Push images
docker push ghcr.io/technician-marketplace/backend:latest
docker push ghcr.io/technician-marketplace/web-frontend:latest
```

### 2. Deploy Database Services

```bash
# Deploy PostgreSQL
kubectl apply -f infrastructure/kubernetes/postgres-deployment.yaml -n production

# Deploy Redis
kubectl apply -f infrastructure/kubernetes/redis-deployment.yaml -n production

# Deploy MongoDB
kubectl apply -f infrastructure/kubernetes/mongodb-deployment.yaml -n production

# Deploy Elasticsearch
kubectl apply -f infrastructure/kubernetes/elasticsearch-deployment.yaml -n production

# Wait for databases to be ready
kubectl wait --for=condition=ready pod -l app=postgres -n production --timeout=300s
```

### 3. Run Database Migrations

```bash
# Apply migration job
kubectl apply -f infrastructure/kubernetes/migration-job.yaml -n production

# Wait for migration to complete
kubectl wait --for=condition=complete job/migration-job -n production --timeout=300s

# Check migration logs
kubectl logs job/migration-job -n production
```

### 4. Deploy Application Services

```bash
# Deploy backend
kubectl apply -f infrastructure/kubernetes/backend-deployment.yaml -n production

# Deploy web frontend
kubectl apply -f infrastructure/kubernetes/web-frontend-deployment.yaml -n production

# Wait for deployments
kubectl rollout status deployment/backend -n production
kubectl rollout status deployment/web-frontend -n production
```

### 5. Configure Ingress

```bash
# Apply ingress configuration
kubectl apply -f infrastructure/kubernetes/ingress.yaml -n production

# Verify ingress
kubectl get ingress -n production
```

### 6. Verify Deployment

```bash
# Check pod status
kubectl get pods -n production

# Check services
kubectl get svc -n production

# Test health endpoint
curl https://api.technician-marketplace.com/health

# Check logs
kubectl logs -f deployment/backend -n production
```

---

## Monitoring Setup

### 1. Deploy Monitoring Stack

```bash
# Start monitoring services
cd infrastructure/monitoring
docker-compose -f docker-compose.monitoring.yml up -d

# Or deploy to Kubernetes
kubectl apply -f infrastructure/kubernetes/monitoring/ -n monitoring
```

### 2. Configure Grafana

1. Access Grafana: `http://grafana.technician-marketplace.com`
2. Login with admin credentials
3. Import dashboards from `infrastructure/monitoring/grafana/dashboards/`
4. Configure alert channels (Slack, email, etc.)

### 3. Configure Alertmanager

Edit `infrastructure/monitoring/alertmanager/alertmanager.yml`:

```yaml
receivers:
  - name: 'slack'
    slack_configs:
      - api_url: 'YOUR_SLACK_WEBHOOK_URL'
        channel: '#alerts'
        
  - name: 'email'
    email_configs:
      - to: 'ops@technician-marketplace.com'
        from: 'alerts@technician-marketplace.com'
```

### 4. Verify Monitoring

```bash
# Check Prometheus targets
curl http://prometheus:9090/api/v1/targets

# Check Grafana dashboards
curl http://grafana:3000/api/health

# Test alerts
curl -X POST http://alertmanager:9093/api/v1/alerts
```

---

## Backup Configuration

### 1. Configure Automated Backups

```bash
# Apply backup CronJobs
kubectl apply -f infrastructure/backup/backup-cron.yaml -n production

# Verify CronJobs
kubectl get cronjobs -n production
```

### 2. Test Backup

```bash
# Trigger manual backup
kubectl create job --from=cronjob/postgres-backup manual-backup-$(date +%s) -n production

# Check backup status
kubectl logs job/manual-backup-* -n production

# Verify backup in S3
aws s3 ls s3://technician-marketplace-backups/postgres/
```

### 3. Test Restore

```bash
# Download backup
aws s3 cp s3://technician-marketplace-backups/postgres/latest.sql.gz /tmp/

# Restore to test database
./infrastructure/backup/postgres-restore.sh /tmp/latest.sql.gz
```

---

## Troubleshooting

### Common Issues

#### 1. Pods Not Starting

```bash
# Check pod status
kubectl describe pod <pod-name> -n production

# Check events
kubectl get events -n production --sort-by='.lastTimestamp'

# Check logs
kubectl logs <pod-name> -n production
```

#### 2. Database Connection Issues

```bash
# Test database connectivity
kubectl run -it --rm debug --image=postgres:15-alpine --restart=Never -- \
  psql -h postgres-service -U postgres -d technician_marketplace

# Check database service
kubectl get svc postgres-service -n production
```

#### 3. SSL Certificate Issues

```bash
# Check certificate status
kubectl describe certificate technician-marketplace-tls -n production

# Check cert-manager logs
kubectl logs -n cert-manager deployment/cert-manager
```

#### 4. High Memory Usage

```bash
# Check resource usage
kubectl top pods -n production

# Scale up if needed
kubectl scale deployment/backend --replicas=5 -n production
```

---

## Rollback Procedures

### 1. Rollback Deployment

```bash
# Rollback to previous version
kubectl rollout undo deployment/backend -n production

# Rollback to specific revision
kubectl rollout undo deployment/backend --to-revision=2 -n production

# Check rollout history
kubectl rollout history deployment/backend -n production
```

### 2. Rollback Database

```bash
# Restore from backup
./infrastructure/backup/postgres-restore.sh s3://technician-marketplace-backups/postgres/postgres_technician_marketplace_YYYYMMDD_HHMMSS.sql.gz

# Revert migrations
npm run migration:revert --workspace=packages/backend
```

### 3. Blue-Green Rollback

```bash
# Switch traffic back to blue environment
kubectl patch service backend -n production -p '{"spec":{"selector":{"version":"blue"}}}'

# Scale down green
kubectl scale deployment/backend-green --replicas=0 -n production
```

---

## Post-Deployment Checklist

- [ ] All pods are running
- [ ] Health checks are passing
- [ ] SSL certificates are valid
- [ ] Monitoring is active
- [ ] Alerts are configured
- [ ] Backups are running
- [ ] DNS is configured correctly
- [ ] Load balancer is working
- [ ] Application is accessible
- [ ] Database migrations completed
- [ ] Logs are being collected
- [ ] Metrics are being collected
- [ ] Documentation is updated

---

## Support

For deployment issues or questions:

- **Email:** devops@technician-marketplace.com
- **Slack:** #deployment-support
- **On-call:** +1-XXX-XXX-XXXX

---

**Document Version:** 1.0  
**Last Updated:** 2024-01-15  
**Next Review:** 2024-04-15
