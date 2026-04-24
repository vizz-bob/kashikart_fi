#!/bin/bash
# ═══════════════════════════════════════════════════════════════
#  KashiKart — RDS PostgreSQL Setup Helper
#
#  Run this ONCE from your local machine (requires AWS CLI).
#  Creates an RDS PostgreSQL instance in ap-south-1 (Mumbai)
#  and configures the initial database.
#
#  Prerequisites:
#    aws configure  (set Access Key, Secret, region=ap-south-1)
#    EC2 Security Group ID (to allow RDS access from EC2 only)
#
#  Usage:
#    chmod +x scripts/setup-rds.sh
#    ./scripts/setup-rds.sh
# ═══════════════════════════════════════════════════════════════

set -e

# ── CONFIGURE THESE BEFORE RUNNING ────────────────────────────
DB_INSTANCE_ID="kashikart-db"
DB_NAME="kashikart_db"
DB_USER="kashikart_user"
DB_PASSWORD="CHANGE_THIS_PASSWORD"   # Use a strong password!
DB_CLASS="db.t3.micro"               # Free tier eligible
DB_ENGINE_VERSION="16.4"
REGION="ap-south-1"
EC2_SG_ID="sg-XXXXXXXXXXXXXXXXX"     # EC2 instance Security Group ID
VPC_ID="vpc-XXXXXXXXXXXXXXXXX"       # Your VPC ID
# ──────────────────────────────────────────────────────────────

echo "======================================================"
echo "  KashiKart RDS PostgreSQL Setup"
echo "  Region: $REGION"
echo "  DB ID : $DB_INSTANCE_ID"
echo "======================================================"

# ── 1. Create a dedicated Security Group for RDS ──────────────
echo ""
echo "[1/5] Creating RDS Security Group..."
RDS_SG_ID=$(aws ec2 create-security-group \
  --group-name "kashikart-rds-sg" \
  --description "KashiKart RDS — allow PostgreSQL from EC2 only" \
  --vpc-id "$VPC_ID" \
  --region "$REGION" \
  --output text --query 'GroupId' 2>/dev/null || \
  aws ec2 describe-security-groups \
    --filters "Name=group-name,Values=kashikart-rds-sg" \
    --region "$REGION" \
    --query 'SecurityGroups[0].GroupId' \
    --output text)

echo "  RDS Security Group: $RDS_SG_ID"

# Allow port 5432 from EC2 security group only
aws ec2 authorize-security-group-ingress \
  --group-id "$RDS_SG_ID" \
  --protocol tcp \
  --port 5432 \
  --source-group "$EC2_SG_ID" \
  --region "$REGION" 2>/dev/null || echo "  (Rule may already exist — skipping)"

echo "  Port 5432 allowed from EC2 SG $EC2_SG_ID"

# ── 2. Create DB Subnet Group ─────────────────────────────────
echo ""
echo "[2/5] Creating DB Subnet Group..."
# Get two subnets from the VPC (need at least 2 AZs for RDS)
SUBNET_IDS=$(aws ec2 describe-subnets \
  --filters "Name=vpc-id,Values=$VPC_ID" \
  --region "$REGION" \
  --query 'Subnets[0:2].SubnetId' \
  --output text | tr '\t' ' ')

aws rds create-db-subnet-group \
  --db-subnet-group-name "kashikart-subnet-group" \
  --db-subnet-group-description "KashiKart RDS subnet group" \
  --subnet-ids $SUBNET_IDS \
  --region "$REGION" 2>/dev/null || echo "  Subnet group may already exist — skipping."

echo "  DB Subnet Group ready."

# ── 3. Create RDS instance ────────────────────────────────────
echo ""
echo "[3/5] Creating RDS PostgreSQL instance (this takes 5-10 min)..."
aws rds create-db-instance \
  --db-instance-identifier "$DB_INSTANCE_ID" \
  --db-instance-class "$DB_CLASS" \
  --engine postgres \
  --engine-version "$DB_ENGINE_VERSION" \
  --master-username "$DB_USER" \
  --master-user-password "$DB_PASSWORD" \
  --db-name "$DB_NAME" \
  --allocated-storage 20 \
  --storage-type gp2 \
  --no-multi-az \
  --no-publicly-accessible \
  --vpc-security-group-ids "$RDS_SG_ID" \
  --db-subnet-group-name "kashikart-subnet-group" \
  --backup-retention-period 7 \
  --deletion-protection \
  --region "$REGION" 2>/dev/null || echo "  Instance may already exist — skipping creation."

echo "  Waiting for RDS to become available..."
aws rds wait db-instance-available \
  --db-instance-identifier "$DB_INSTANCE_ID" \
  --region "$REGION"

# ── 4. Get the endpoint ───────────────────────────────────────
echo ""
echo "[4/5] Fetching RDS endpoint..."
RDS_ENDPOINT=$(aws rds describe-db-instances \
  --db-instance-identifier "$DB_INSTANCE_ID" \
  --region "$REGION" \
  --query 'DBInstances[0].Endpoint.Address' \
  --output text)

echo "  RDS Endpoint: $RDS_ENDPOINT"

# ── 5. Print .env DATABASE_URL ───────────────────────────────
echo ""
echo "[5/5] Done! Add this to your .env file on EC2:"
echo ""
echo "  DATABASE_URL=postgresql+asyncpg://$DB_USER:$DB_PASSWORD@$RDS_ENDPOINT:5432/$DB_NAME"
echo "  DATABASE_PASSWORD=$DB_PASSWORD"
echo ""
echo "======================================================"
echo "  RDS SETUP COMPLETE"
echo "======================================================"
echo ""
echo "  DB Instance : $DB_INSTANCE_ID"
echo "  Endpoint    : $RDS_ENDPOINT"
echo "  Port        : 5432"
echo "  DB Name     : $DB_NAME"
echo "  Username    : $DB_USER"
echo ""
echo "  Copy the DATABASE_URL above into:"
echo "    /home/ubuntu/kashikart/.env  (on EC2)"
echo "    GitHub Secrets → DB_HOST, DB_NAME, DB_USER, DB_PASSWORD"
echo ""
echo "  IMPORTANT: Never commit the real .env to git!"
echo "======================================================"
