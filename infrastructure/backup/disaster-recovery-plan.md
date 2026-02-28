# Disaster Recovery Plan
## Technician Marketplace Platform

### Overview
This document outlines the disaster recovery procedures for the Technician Marketplace Platform, including backup strategies, recovery procedures, and business continuity plans.

---

## 1. Backup Strategy

### 1.1 Database Backups (PostgreSQL)

**Frequency:**
- Full backups: Daily at 2:00 AM UTC
- Incremental backups: Every 6 hours
- Transaction logs: Continuous (WAL archiving)

**Retention:**
- Daily backups: 30 days
- Weekly backups: 90 days
- Monthly backups: 1 year

**Storage:**
- Primary: AWS S3 (Standard-IA storage class)
- Secondary: AWS S3 Glacier (for long-term retention)
- Geographic redundancy: Multi-region replication

**Backup Script:**
```bash
/infrastructure/backup/postgres-backup.sh
```

**Automated Schedule:**
```cron
# Daily full backup at 2:00 AM UTC
0 2 * * * /infrastructure/backup/postgres-backup.sh

# Incremental backup every 6 hours
0 */6 * * * /infrastructure/backup/postgres-incremental.sh
```

### 1.2 Redis Backups

**Frequency:**
- RDB snapshots: Every 6 hours
- AOF persistence: Enabled (fsync every second)

**Retention:**
- Snapshots: 7 days

**Storage:**
- AWS S3

### 1.3 MongoDB Backups

**Frequency:**
- Full backups: Daily at 3:00 AM UTC

**Retention:**
- Daily backups: 30 days

**Storage:**
- AWS S3

### 1.4 File Storage Backups (S3)

**Strategy:**
- Versioning: Enabled
- Cross-region replication: Enabled
- Lifecycle policies: Move to Glacier after 90 days

### 1.5 Application Code

**Strategy:**
- Git repository: GitHub (primary)
- Docker images: GitHub Container Registry
- Retention: All versions

---

## 2. Recovery Time Objectives (RTO) and Recovery Point Objectives (RPO)

| Component | RTO | RPO | Priority |
|-----------|-----|-----|----------|
| Database (PostgreSQL) | 1 hour | 15 minutes | Critical |
| Cache (Redis) | 30 minutes | 1 hour | High |
| Document Store (MongoDB) | 1 hour | 1 hour | High |
| Application Services | 30 minutes | 0 (stateless) | Critical |
| File Storage | 2 hours | 1 hour | Medium |

---

## 3. Disaster Scenarios and Recovery Procedures

### 3.1 Database Corruption or Data Loss

**Detection:**
- Automated integrity checks
- Application error monitoring
- User reports

**Recovery Steps:**

1. **Assess the damage:**
   ```bash
   psql -U postgres -d technician_marketplace -c "SELECT * FROM pg_stat_database;"
   ```

2. **Stop application services:**
   ```bash
   kubectl scale deployment/backend --replicas=0 -n production
   ```

3. **Identify the last good backup:**
   ```bash
   aws s3 ls s3://technician-marketplace-backups/postgres/ | sort -r | head -10
   ```

4. **Restore from backup:**
   ```bash
   ./infrastructure/backup/postgres-restore.sh s3://technician-marketplace-backups/postgres/postgres_technician_marketplace_YYYYMMDD_HHMMSS.sql.gz
   ```

5. **Verify data integrity:**
   ```bash
   psql -U postgres -d technician_marketplace -f infrastructure/backup/verify-integrity.sql
   ```

6. **Restart application services:**
   ```bash
   kubectl scale deployment/backend --replicas=3 -n production
   ```

7. **Monitor for issues:**
   - Check application logs
   - Monitor error rates
   - Verify critical functionality

**Estimated Recovery Time:** 1-2 hours

### 3.2 Complete Infrastructure Failure (Region Outage)

**Recovery Steps:**

1. **Activate DR region:**
   ```bash
   export AWS_REGION=us-west-2  # Failover region
   ```

2. **Restore database in DR region:**
   ```bash
   # Restore from cross-region replicated backup
   ./infrastructure/backup/postgres-restore.sh latest
   ```

3. **Deploy application to DR region:**
   ```bash
   ./infrastructure/scripts/deploy.sh production
   ```

4. **Update DNS records:**
   ```bash
   # Point to DR region load balancer
   aws route53 change-resource-record-sets --hosted-zone-id ZXXXXX --change-batch file://dns-failover.json
   ```

5. **Verify services:**
   ```bash
   curl https://api.technician-marketplace.com/health
   ```

**Estimated Recovery Time:** 2-4 hours

### 3.3 Accidental Data Deletion

**Recovery Steps:**

1. **Identify the deletion time:**
   - Check application logs
   - Review audit logs

2. **Perform point-in-time recovery:**
   ```bash
   # Restore to specific timestamp
   ./infrastructure/backup/postgres-pitr.sh "2024-01-15 14:30:00"
   ```

3. **Extract deleted data:**
   ```bash
   pg_dump -h localhost -U postgres -d technician_marketplace_restored -t deleted_table > deleted_data.sql
   ```

4. **Restore deleted data to production:**
   ```bash
   psql -h production-db -U postgres -d technician_marketplace < deleted_data.sql
   ```

**Estimated Recovery Time:** 30 minutes - 1 hour

### 3.4 Ransomware or Security Breach

**Immediate Actions:**

1. **Isolate affected systems:**
   ```bash
   # Block all external traffic
   kubectl apply -f infrastructure/kubernetes/network-policy-lockdown.yaml
   ```

2. **Preserve evidence:**
   ```bash
   # Create snapshots of affected systems
   aws ec2 create-snapshot --volume-id vol-xxxxx --description "Incident-$(date +%Y%m%d)"
   ```

3. **Assess the breach:**
   - Review security logs
   - Identify compromised accounts
   - Determine data exposure

4. **Restore from clean backup:**
   ```bash
   # Use backup from before the breach
   ./infrastructure/backup/postgres-restore.sh s3://technician-marketplace-backups/postgres/postgres_technician_marketplace_YYYYMMDD_HHMMSS.sql.gz
   ```

5. **Rotate all credentials:**
   ```bash
   ./infrastructure/scripts/rotate-credentials.sh
   ```

6. **Apply security patches:**
   ```bash
   kubectl set image deployment/backend backend=ghcr.io/technician-marketplace/backend:patched
   ```

7. **Notify stakeholders:**
   - Internal team
   - Affected users
   - Regulatory authorities (if required)

**Estimated Recovery Time:** 4-8 hours

---

## 4. Point-in-Time Recovery (PITR)

### 4.1 Enable WAL Archiving

**PostgreSQL Configuration:**
```sql
-- postgresql.conf
wal_level = replica
archive_mode = on
archive_command = 'aws s3 cp %p s3://technician-marketplace-backups/wal/%f'
archive_timeout = 300  # 5 minutes
```

### 4.2 Perform PITR

```bash
# Restore to specific point in time
./infrastructure/backup/postgres-pitr.sh "2024-01-15 14:30:00"
```

---

## 5. Testing and Validation

### 5.1 Regular DR Drills

**Frequency:** Quarterly

**Procedure:**
1. Schedule drill during low-traffic period
2. Notify team members
3. Execute recovery procedures
4. Document results and issues
5. Update procedures based on findings

### 5.2 Backup Verification

**Automated Tests:**
```bash
# Daily backup verification
./infrastructure/backup/verify-backup.sh
```

**Manual Tests:**
- Monthly: Restore to test environment
- Quarterly: Full DR drill

---

## 6. Communication Plan

### 6.1 Incident Response Team

| Role | Primary | Backup | Contact |
|------|---------|--------|---------|
| Incident Commander | DevOps Lead | CTO | +1-XXX-XXX-XXXX |
| Database Admin | DBA Lead | Senior DBA | +1-XXX-XXX-XXXX |
| Application Lead | Backend Lead | Senior Developer | +1-XXX-XXX-XXXX |
| Communications | Product Manager | Marketing Lead | +1-XXX-XXX-XXXX |

### 6.2 Escalation Path

1. **Level 1:** On-call engineer (0-15 minutes)
2. **Level 2:** Team lead (15-30 minutes)
3. **Level 3:** Engineering manager (30-60 minutes)
4. **Level 4:** CTO (60+ minutes)

### 6.3 Status Updates

**Internal:**
- Slack channel: #incident-response
- Email: engineering@technician-marketplace.com
- Frequency: Every 30 minutes during incident

**External:**
- Status page: status.technician-marketplace.com
- Email: Users affected by the incident
- Social media: Major incidents only

---

## 7. Post-Incident Review

### 7.1 Incident Report Template

```markdown
# Incident Report: [Title]

## Summary
- Date/Time: 
- Duration: 
- Impact: 
- Root Cause: 

## Timeline
- [Time] - Event description

## Resolution
- Actions taken
- Recovery time

## Lessons Learned
- What went well
- What could be improved
- Action items

## Follow-up Actions
- [ ] Action item 1
- [ ] Action item 2
```

### 7.2 Review Meeting

**Attendees:**
- Incident response team
- Engineering leadership
- Product management

**Agenda:**
1. Incident timeline review
2. Root cause analysis
3. Response effectiveness
4. Improvement opportunities
5. Action item assignment

---

## 8. Maintenance and Updates

**Document Review:** Quarterly
**Procedure Updates:** As needed
**Contact Information:** Monthly verification
**DR Drill Results:** After each drill

---

## 9. Compliance and Audit

### 9.1 Backup Audit Log

All backup and restore operations are logged to:
- CloudWatch Logs
- S3 bucket: s3://technician-marketplace-audit-logs/

### 9.2 Compliance Requirements

- GDPR: Data retention and deletion policies
- PCI DSS: Secure backup storage
- SOC 2: Regular DR testing

---

## 10. Contact Information

**Emergency Contacts:**
- AWS Support: 1-800-XXX-XXXX
- Database Vendor: 1-800-XXX-XXXX
- Security Team: security@technician-marketplace.com

**External Services:**
- DNS Provider: Route53
- CDN Provider: CloudFront
- Monitoring: Datadog

---

**Document Version:** 1.0
**Last Updated:** 2024-01-15
**Next Review:** 2024-04-15
