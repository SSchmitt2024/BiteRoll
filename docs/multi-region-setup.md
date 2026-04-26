# Multi-Region Setup — Manual Steps

All code changes are already on the `multi-region` branch. This document covers only the manual steps you need to do in the AWS console or CLI.

---

## Overview

Goal: Route users to the nearest region (us-east-2 or us-west-2), serve the app from your own domain instead of the CloudFront URL, and replicate your data globally.

```
app.yourdomain.com  →  CloudFront (already global)
api.yourdomain.com  →  Route 53 latency routing
                          ├── us-east-2: Lambda + DynamoDB replica
                          └── us-west-2: Lambda + DynamoDB replica
```

---

## Step 1 — Register a domain (or use one you own)

1. Go to **Route 53 → Registered domains → Register domain**
2. Search for a domain (e.g. `biteroll.com` — ~$12/yr)
3. Complete purchase. DNS propagation takes up to 24 hours but usually under 1 hour.

> If you already own a domain somewhere else (GoDaddy, Namecheap), transfer it to Route 53 or just update its nameservers to the Route 53 hosted zone nameservers. Route 53 creates a hosted zone automatically when you register.

---

## Step 2 — Request ACM certificates

You need **3 certificates** total (all free via ACM):

| Certificate | Region | Covers |
|---|---|---|
| CloudFront cert | **us-east-1** | `app.yourdomain.com` |
| API cert East | **us-east-2** | `api.yourdomain.com` |
| API cert West | **us-west-2** | `api.yourdomain.com` |

**For each certificate:**

1. Go to **ACM → Request certificate → Request public certificate**
2. Enter the domain name (e.g. `app.biteroll.com` or `api.biteroll.com`)
3. Choose **DNS validation**
4. Click **Request**
5. On the next screen click **Create records in Route 53** — this auto-adds the CNAME record
6. Wait ~5 minutes until status shows **Issued**

> The CloudFront cert MUST be in `us-east-1` — CloudFront only uses certs from that region. Switch region in the top-right before requesting it.

Save the 3 ARNs — you'll need them in Step 4.

---

## Step 3 — Migrate the DynamoDB table

The code changed `BiteRollRestaurants` to a Global Table, but CloudFormation can't convert an existing table in-place.

**Export your current data first:**

```bash
aws dynamodb scan \
  --table-name BiteRollRestaurants \
  --region us-east-2 \
  --output json > dynamodb-backup.json
```

**Then:**

1. Go to **DynamoDB → Tables → BiteRollRestaurants → Delete table**
2. Confirm deletion
3. Run `scripts/deploy.sh` — it will recreate the table as a Global Table with replicas in us-east-2 and us-west-2

**Restore your data:**

```bash
# Run scripts/update_urls.py or re-import from the backup
python3 scripts/update_urls.py
```

---

## Step 4 — Deploy the updated east region stack

Set your domain names and cert ARNs, then run the main deploy:

```bash
# Set these before running deploy.sh
export VITE_API_BASE_URL="https://api.yourdomain.com/prod"

# Pass domain + cert to CloudFront stack
aws cloudformation deploy \
  --template-file Infrastructure/CloudFront.yaml \
  --stack-name biteroll-cloudfront \
  --parameter-overrides \
    AppDomainName=app.yourdomain.com \
    AcmCertArn=arn:aws:acm:us-east-1:ACCOUNT_ID:certificate/CERT_ID

# Pass domain + cert to API Gateway stack (east)
aws cloudformation deploy \
  --template-file Infrastructure/APIGateway.yaml \
  --stack-name biteroll-api-gateway \
  --region us-east-2 \
  --parameter-overrides \
    ApiDomainName=api.yourdomain.com \
    RegionalCertArn=arn:aws:acm:us-east-2:ACCOUNT_ID:certificate/CERT_ID
```

Or just run `scripts/deploy.sh` for everything else and do the two commands above separately for the custom domain parameters.

---

## Step 5 — Deploy the west region stack

```bash
# Set these to your west cert ARN and API domain
export API_DOMAIN="api.yourdomain.com"
export CERT_ARN_WEST="arn:aws:acm:us-west-2:ACCOUNT_ID:certificate/CERT_ID"

bash scripts/deploy-west.sh
```

The script will print the 5 values you need for the next step when it finishes.

---

## Step 6 — Deploy Route 53 latency routing

Once you have the values printed by `deploy-west.sh`:

```bash
aws cloudformation deploy \
  --template-file Infrastructure/Route53.yaml \
  --stack-name biteroll-route53 \
  --region us-east-1 \
  --parameter-overrides \
    HostedZoneName=yourdomain.com. \
    ApiDomainName=api.yourdomain.com \
    AppDomainName=app.yourdomain.com \
    EastApiRegionalDomainName=<value from script> \
    EastApiRegionalHostedZoneId=<value from script> \
    WestApiRegionalDomainName=<value from script> \
    WestApiRegionalHostedZoneId=<value from script> \
    CloudFrontDomainName=<value from script>
```

> Route 53 stacks must be deployed to `us-east-1` (Route 53 is a global service but CloudFormation requires a region — east-1 is the convention).

---

## Step 7 — Update the frontend env var

After Route 53 is deployed, update `frontend/.env`:

```
VITE_API_BASE_URL=https://api.yourdomain.com/prod
```

Then rebuild and redeploy the frontend:

```bash
cd frontend && npm run build
aws s3 sync dist s3://biteroll-static-site-sawyer/ --delete --exclude "lambda/*"
# Invalidate CloudFront cache
aws cloudfront create-invalidation --distribution-id <DIST_ID> --paths "/*"
```

---

## Verification checklist

- [ ] `https://app.yourdomain.com` loads the app (not blocked by school network)
- [ ] `https://api.yourdomain.com/prod/feed?lat=43&lng=-71&radius=5000` returns JSON
- [ ] DynamoDB console shows `BiteRollRestaurants` in both us-east-2 and us-west-2
- [ ] S3 console shows `biteroll-media-sawyer-west` receiving objects
- [ ] Route 53 console shows two latency records for `api.yourdomain.com`

---

## Cost impact

| New resource | Estimated cost |
|---|---|
| Route 53 hosted zone | $0.50/month |
| Route 53 latency queries | ~$0.60 per million queries |
| DynamoDB west replica | Same on-demand rates, only charged for writes replicated |
| S3 replication | $0.015/GB replicated + standard S3 storage in west |
| ACM certificates | Free |
| Second Lambda/API Gateway | Free tier covers most usage; ~$0 at low traffic |

Total: roughly **$1-2/month** additional on top of current costs.
