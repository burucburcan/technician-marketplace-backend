# 🚀 Production Deployment Guide
## Teknisyen Bulma Platformu

**Tarih**: 2024  
**Platform Versiyonu**: 1.0.0  
**Durum**: Production-Ready ✅

---

## 📋 İçindekiler

1. [Ön Hazırlık](#ön-hazırlık)
2. [Environment Variables](#environment-variables)
3. [Database Setup](#database-setup)
4. [Docker Build](#docker-build)
5. [Kubernetes Deployment](#kubernetes-deployment)
6. [Domain ve SSL](#domain-ve-ssl)
7. [Monitoring Setup](#monitoring-setup)
8. [Post-Deployment Checks](#post-deployment-checks)
9. [Rollback Plan](#rollback-plan)

---

## 🎯 Ön Hazırlık

### 1. Gerekli Araçlar

```bash
# Versiyonları kontrol et
node --version    # v20+
npm --version     # v10+
docker --version  # v24+
kubectl version   # v1.28+
```

### 2. AWS Credentials

```bash
# AWS CLI kurulu mu?
aws --version

# Credentials yapılandır
aws configure
# AWS Access Key ID: [YOUR_KEY]
# AWS Secret Access Key: [YOUR_SECRET]
# Default region: us-east-1
# Default output format: json
```

### 3. Repository Hazırlığı

```bash
# Son değişiklikleri çek
git pull origin main

# Temiz bir working directory olduğundan emin ol
git status

# Tüm testlerin geçtiğini doğrula
npm test
```

---

## 🔐 Environment Variables

### Backend Environment Variables

`packages/backend/.env.production` dosyası oluştur:

```bash
# Application
NODE_ENV=production
PORT=3000
API_PREFIX=api/v1

# Database - PostgreSQL
DATABASE_HOST=your-rds-endpoint.amazonaws.com
DATABASE_PORT=5432
DATABASE_USERNAME=postgres
DATABASE_PASSWORD=your-secure-password
DATABASE_NAME=technician_platform_prod
DATABASE_SSL=true

# Redis
REDIS_HOST=your-elasticache-endpoint.amazonaws.com
REDIS_PORT=6379
REDIS_PASSWORD=your-redis-password
REDIS_TLS=true

# MongoDB
MONGODB_URI=mongodb://your-documentdb-endpoint:27017/technician_platform_prod?ssl=true&replicaSet=rs0

# ElasticSearch
ELASTICSEARCH_NODE=https://your-elasticsearch-endpoint.amazonaws.com:443
ELASTICSEARCH_USERNAME=elastic
ELASTICSEARCH_PASSWORD=your-elastic-password

# JWT
JWT_SECRET=your-super-secret-jwt-key-min-32-chars
JWT_EXPIRATION=24h
JWT_REFRESH_SECRET=your-refresh-token-secret
JWT_REFRESH_EXPIRATION=7d

# AWS S3
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=your-aws-access-key
AWS_SECRET_ACCESS_KEY=your-aws-secret-key
AWS_S3_BUCKET=technician-platform-files-prod

# External Services
STRIPE_SECRET_KEY=sk_live_your_stripe_secret_key
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret
GOOGLE_MAPS_API_KEY=your_google_maps_api_key
SENDGRID_API_KEY=SG.your_sendgrid_api_key
TWILIO_ACCOUNT_SID=your_twilio_account_sid
TWILIO_AUTH_TOKEN=your_twilio_auth_token
TWILIO_PHONE_NUMBER=+1234567890

# CORS
CORS_ORIGIN=https://your-domain.com,https://www.your-domain.com

# Rate Limiting
RATE_LIMIT_TTL=60
RATE_LIMIT_MAX=100

# Logging
LOG_LEVEL=info
SENTRY_DSN=https://your-sentry-dsn@sentry.io/project-id
```

### Frontend Environment Variables

`packages/web-frontend/.env.production` dosyası oluştur:

```bash
VITE_API_URL=https://api.your-domain.com
VITE_STRIPE_PUBLIC_KEY=pk_live_your_stripe_public_key
VITE_GOOGLE_MAPS_API_KEY=your_google_maps_api_key
VITE_SENTRY_DSN=https://your-sentry-dsn@sentry.io/project-id
```

### Mobile Environment Variables

`packages/mobile-frontend/.env.production` dosyası oluştur:

```bash
API_URL=https://api.your-domain.com
STRIPE_PUBLIC_KEY=pk_live_your_stripe_public_key
GOOGLE_MAPS_API_KEY=your_google_maps_api_key
FIREBASE_API_KEY=your_firebase_api_key
FIREBASE_PROJECT_ID=your_firebase_project_id
SENTRY_DSN=https://your-sentry-dsn@sentry.io/project-id
```

---

## 💾 Database Setup

### 1. PostgreSQL (AWS RDS)

```bash
# RDS instance oluştur
aws rds create-db-instance \
  --db-instance-identifier technician-platform-prod \
  --db-instance-class db.t3.medium \
  --engine postgres \
  --engine-version 15.4 \
  --master-username postgres \
  --master-user-password your-secure-password \
  --allocated-storage 100 \
  --storage-type gp3 \
  --vpc-security-group-ids sg-xxxxxxxxx \
  --db-subnet-group-name your-subnet-group \
  --backup-retention-period 7 \
  --preferred-backup-window "03:00-04:00" \
  --preferred-maintenance-window "mon:04:00-mon:05:00" \
  --multi-az \
  --storage-encrypted \
  --enable-cloudwatch-logs-exports '["postgresql"]'

# Migration'ları çalıştır
cd packages/backend
npm run migration:run
```

### 2. Redis (AWS ElastiCache)

```bash
# ElastiCache cluster oluştur
aws elasticache create-replication-group \
  --replication-group-id technician-platform-redis \
  --replication-group-description "Redis for Technician Platform" \
  --engine redis \
  --cache-node-type cache.t3.medium \
  --num-cache-clusters 2 \
  --automatic-failover-enabled \
  --at-rest-encryption-enabled \
  --transit-encryption-enabled \
  --auth-token your-redis-password \
  --cache-subnet-group-name your-subnet-group \
  --security-group-ids sg-xxxxxxxxx
```

### 3. MongoDB (AWS DocumentDB)

```bash
# DocumentDB cluster oluştur
aws docdb create-db-cluster \
  --db-cluster-identifier technician-platform-docdb \
  --engine docdb \
  --master-username admin \
  --master-user-password your-secure-password \
  --vpc-security-group-ids sg-xxxxxxxxx \
  --db-subnet-group-name your-subnet-group \
  --storage-encrypted \
  --backup-retention-period 7

# Instance ekle
aws docdb create-db-instance \
  --db-instance-identifier technician-platform-docdb-instance \
  --db-instance-class db.t3.medium \
  --engine docdb \
  --db-cluster-identifier technician-platform-docdb
```

### 4. ElasticSearch (AWS OpenSearch)

```bash
# OpenSearch domain oluştur
aws opensearch create-domain \
  --domain-name technician-platform-search \
  --engine-version OpenSearch_2.11 \
  --cluster-config InstanceType=t3.medium.search,InstanceCount=2 \
  --ebs-options EBSEnabled=true,VolumeType=gp3,VolumeSize=100 \
  --access-policies file://opensearch-access-policy.json \
  --encryption-at-rest-options Enabled=true \
  --node-to-node-encryption-options Enabled=true \
  --domain-endpoint-options EnforceHTTPS=true
```

---

## 🐳 Docker Build

### 1. Backend Image

```bash
cd packages/backend

# Build image
docker build -t technician-platform-backend:1.0.0 .

# Tag for ECR
docker tag technician-platform-backend:1.0.0 \
  your-account-id.dkr.ecr.us-east-1.amazonaws.com/technician-platform-backend:1.0.0

# Push to ECR
aws ecr get-login-password --region us-east-1 | \
  docker login --username AWS --password-stdin \
  your-account-id.dkr.ecr.us-east-1.amazonaws.com

docker push your-account-id.dkr.ecr.us-east-1.amazonaws.com/technician-platform-backend:1.0.0
```

### 2. Web Frontend Image

```bash
cd packages/web-frontend

# Build
npm run build

# Build Docker image
docker build -t technician-platform-web:1.0.0 .

# Tag and push
docker tag technician-platform-web:1.0.0 \
  your-account-id.dkr.ecr.us-east-1.amazonaws.com/technician-platform-web:1.0.0

docker push your-account-id.dkr.ecr.us-east-1.amazonaws.com/technician-platform-web:1.0.0
```

### 3. Nginx Image

```bash
cd infrastructure/nginx

# Build
docker build -t technician-platform-nginx:1.0.0 .

# Tag and push
docker tag technician-platform-nginx:1.0.0 \
  your-account-id.dkr.ecr.us-east-1.amazonaws.com/technician-platform-nginx:1.0.0

docker push your-account-id.dkr.ecr.us-east-1.amazonaws.com/technician-platform-nginx:1.0.0
```

---

## ☸️ Kubernetes Deployment

### 1. EKS Cluster Oluştur

```bash
# eksctl ile cluster oluştur
eksctl create cluster \
  --name technician-platform-prod \
  --region us-east-1 \
  --nodegroup-name standard-workers \
  --node-type t3.large \
  --nodes 3 \
  --nodes-min 2 \
  --nodes-max 5 \
  --managed

# kubectl context'i ayarla
aws eks update-kubeconfig --region us-east-1 --name technician-platform-prod
```

### 2. Secrets Oluştur

```bash
# Database secrets
kubectl create secret generic db-secrets \
  --from-literal=host=your-rds-endpoint.amazonaws.com \
  --from-literal=username=postgres \
  --from-literal=password=your-secure-password \
  --from-literal=database=technician_platform_prod

# Redis secrets
kubectl create secret generic redis-secrets \
  --from-literal=host=your-elasticache-endpoint.amazonaws.com \
  --from-literal=password=your-redis-password

# JWT secrets
kubectl create secret generic jwt-secrets \
  --from-literal=secret=your-super-secret-jwt-key \
  --from-literal=refresh-secret=your-refresh-token-secret

# External service secrets
kubectl create secret generic external-secrets \
  --from-literal=stripe-secret=sk_live_your_stripe_secret_key \
  --from-literal=google-maps-key=your_google_maps_api_key \
  --from-literal=sendgrid-key=SG.your_sendgrid_api_key \
  --from-literal=twilio-sid=your_twilio_account_sid \
  --from-literal=twilio-token=your_twilio_auth_token
```

### 3. Deploy Backend

```bash
# Backend deployment'ı güncelle
kubectl apply -f infrastructure/kubernetes/backend-deployment.yaml

# Service oluştur
kubectl apply -f infrastructure/kubernetes/backend-service.yaml

# Deployment durumunu kontrol et
kubectl rollout status deployment/backend
kubectl get pods -l app=backend
```

### 4. Deploy Ingress

```bash
# Ingress controller kur (nginx)
kubectl apply -f https://raw.githubusercontent.com/kubernetes/ingress-nginx/controller-v1.8.2/deploy/static/provider/aws/deploy.yaml

# Ingress oluştur
kubectl apply -f infrastructure/kubernetes/ingress.yaml

# Load balancer IP'sini al
kubectl get ingress
```

---

## 🌐 Domain ve SSL

### 1. Domain Yapılandırması

```bash
# Load Balancer DNS'ini al
LB_DNS=$(kubectl get ingress technician-platform-ingress -o jsonpath='{.status.loadBalancer.ingress[0].hostname}')

echo "Load Balancer DNS: $LB_DNS"

# Route53'te A record oluştur
aws route53 change-resource-record-sets \
  --hosted-zone-id YOUR_HOSTED_ZONE_ID \
  --change-batch '{
    "Changes": [{
      "Action": "CREATE",
      "ResourceRecordSet": {
        "Name": "api.your-domain.com",
        "Type": "CNAME",
        "TTL": 300,
        "ResourceRecords": [{"Value": "'$LB_DNS'"}]
      }
    }]
  }'
```

### 2. SSL Certificate (Let's Encrypt)

```bash
# cert-manager kur
kubectl apply -f https://github.com/cert-manager/cert-manager/releases/download/v1.13.0/cert-manager.yaml

# ClusterIssuer oluştur
cat <<EOF | kubectl apply -f -
apiVersion: cert-manager.io/v1
kind: ClusterIssuer
metadata:
  name: letsencrypt-prod
spec:
  acme:
    server: https://acme-v02.api.letsencrypt.org/directory
    email: your-email@example.com
    privateKeySecretRef:
      name: letsencrypt-prod
    solvers:
    - http01:
        ingress:
          class: nginx
EOF

# Ingress'i SSL ile güncelle
kubectl annotate ingress technician-platform-ingress \
  cert-manager.io/cluster-issuer=letsencrypt-prod

# Certificate durumunu kontrol et
kubectl get certificate
kubectl describe certificate technician-platform-tls
```

---

## 📊 Monitoring Setup

### 1. Prometheus ve Grafana

```bash
# Helm kur (eğer yoksa)
curl https://raw.githubusercontent.com/helm/helm/main/scripts/get-helm-3 | bash

# Prometheus stack kur
helm repo add prometheus-community https://prometheus-community.github.io/helm-charts
helm repo update

helm install prometheus prometheus-community/kube-prometheus-stack \
  --namespace monitoring \
  --create-namespace \
  --set prometheus.prometheusSpec.retention=30d \
  --set grafana.adminPassword=your-grafana-password

# Grafana'ya erişim
kubectl port-forward -n monitoring svc/prometheus-grafana 3000:80
# http://localhost:3000 (admin / your-grafana-password)
```

### 2. Loki (Log Aggregation)

```bash
# Loki kur
helm repo add grafana https://grafana.github.io/helm-charts
helm install loki grafana/loki-stack \
  --namespace monitoring \
  --set grafana.enabled=false \
  --set prometheus.enabled=false

# Promtail kur (log collector)
kubectl apply -f infrastructure/monitoring/promtail/promtail-config.yml
```

### 3. Sentry (Error Tracking)

```bash
# Sentry SDK zaten backend'de kurulu
# Sadece DSN'i environment variable'a ekle
# SENTRY_DSN=https://your-sentry-dsn@sentry.io/project-id
```

---

## ✅ Post-Deployment Checks

### 1. Health Checks

```bash
# Backend health check
curl https://api.your-domain.com/health

# Expected response:
# {"status":"ok","timestamp":"2024-...","uptime":123}

# Database connection check
curl https://api.your-domain.com/health/db

# Redis connection check
curl https://api.your-domain.com/health/redis
```

### 2. Smoke Tests

```bash
# User registration
curl -X POST https://api.your-domain.com/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "Test123!@#",
    "firstName": "Test",
    "lastName": "User"
  }'

# Login
curl -X POST https://api.your-domain.com/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "Test123!@#"
  }'

# Get professionals
curl https://api.your-domain.com/api/v1/search/professionals \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### 3. Performance Tests

```bash
# API response time
curl -w "@curl-format.txt" -o /dev/null -s https://api.your-domain.com/health

# curl-format.txt içeriği:
# time_namelookup:  %{time_namelookup}\n
# time_connect:  %{time_connect}\n
# time_appconnect:  %{time_appconnect}\n
# time_pretransfer:  %{time_pretransfer}\n
# time_redirect:  %{time_redirect}\n
# time_starttransfer:  %{time_starttransfer}\n
# ----------\n
# time_total:  %{time_total}\n
```

### 4. Monitoring Dashboards

```bash
# Grafana dashboard'ları import et
kubectl port-forward -n monitoring svc/prometheus-grafana 3000:80

# Browser'da aç: http://localhost:3000
# Dashboards > Import > infrastructure/monitoring/grafana/dashboards/api-dashboard.json
```

---

## 🔄 Rollback Plan

### Hızlı Rollback

```bash
# Önceki versiyona dön
kubectl rollout undo deployment/backend

# Belirli bir revision'a dön
kubectl rollout history deployment/backend
kubectl rollout undo deployment/backend --to-revision=2

# Rollout durumunu kontrol et
kubectl rollout status deployment/backend
```

### Database Rollback

```bash
# Migration'ı geri al
cd packages/backend
npm run migration:revert

# Backup'tan restore et
aws rds restore-db-instance-from-db-snapshot \
  --db-instance-identifier technician-platform-prod-restored \
  --db-snapshot-identifier technician-platform-backup-2024-xx-xx
```

---

## 📞 Support ve Troubleshooting

### Logs

```bash
# Backend logs
kubectl logs -f deployment/backend

# Tüm pod'ların logları
kubectl logs -f -l app=backend

# Önceki container'ın logları
kubectl logs deployment/backend --previous
```

### Debug

```bash
# Pod'a bağlan
kubectl exec -it deployment/backend -- /bin/bash

# Database bağlantısını test et
kubectl exec -it deployment/backend -- npm run typeorm query "SELECT 1"

# Redis bağlantısını test et
kubectl exec -it deployment/backend -- redis-cli -h $REDIS_HOST ping
```

### Metrics

```bash
# Pod metrics
kubectl top pods

# Node metrics
kubectl top nodes

# Resource usage
kubectl describe pod <pod-name>
```

---

## 🎯 Checklist

### Pre-Deployment
- [ ] Tüm testler geçiyor
- [ ] Environment variables hazır
- [ ] Database backup alındı
- [ ] SSL certificate hazır
- [ ] Domain DNS yapılandırıldı
- [ ] Monitoring kuruldu

### Deployment
- [ ] Docker images build edildi
- [ ] Images ECR'a push edildi
- [ ] Kubernetes secrets oluşturuldu
- [ ] Backend deploy edildi
- [ ] Ingress yapılandırıldı
- [ ] SSL certificate oluşturuldu

### Post-Deployment
- [ ] Health checks geçiyor
- [ ] Smoke tests başarılı
- [ ] Monitoring çalışıyor
- [ ] Logs akıyor
- [ ] Performance kabul edilebilir
- [ ] Rollback planı test edildi

---

## 📚 Ek Kaynaklar

- [AWS EKS Documentation](https://docs.aws.amazon.com/eks/)
- [Kubernetes Documentation](https://kubernetes.io/docs/)
- [NestJS Production Best Practices](https://docs.nestjs.com/)
- [React Production Build](https://react.dev/learn/start-a-new-react-project)

---

**Deployment Tarihi**: 2024  
**Platform Versiyonu**: 1.0.0  
**Hazırlayan**: Kiro AI

