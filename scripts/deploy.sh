#!/bin/bash
 
set -e
export AWS_PAGER=""
trap 'status=$?; line=$LINENO; echo ""; echo "DEPLOY FAILED at line $line (exit code $status)"; exit $status' ERR

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"
EAST_SECRET_ARN=""
CLOUDTRAIL_BUCKET_NAME="${CLOUDTRAIL_BUCKET_NAME:-biteroll-cloudtrail-logs-sawyer}"

require_google_maps_key() {
    if [ -z "${GOOGLE_MAPS_API_KEY:-}" ]; then
        echo "GOOGLE_MAPS_API_KEY is required to create the biteroll/google-maps-api-key secret."
        echo "Set it in the environment or add it as a GitHub Actions secret."
        exit 1
    fi
}

ensure_google_maps_secret() {
    local exported_secret_arn
    local existing_secret_arn

    exported_secret_arn=$(aws cloudformation list-exports \
        --query "Exports[?Name=='SecretsARN'].Value" \
        --output text 2>/dev/null || echo "")

    if [ -n "$exported_secret_arn" ] && [ "$exported_secret_arn" != "None" ]; then
        EAST_SECRET_ARN="$exported_secret_arn"
        echo "Secrets stack already exports SecretsARN; preserving existing Google Maps key."
        return
    fi

    existing_secret_arn=$(aws secretsmanager describe-secret \
        --secret-id biteroll/google-maps-api-key \
        --query "ARN" \
        --output text 2>/dev/null || echo "")

    if [ -n "$existing_secret_arn" ] && [ "$existing_secret_arn" != "None" ]; then
        EAST_SECRET_ARN="$existing_secret_arn"
        echo "Found existing biteroll/google-maps-api-key secret; using it for Lambda."
        return
    fi

    require_google_maps_key
    aws cloudformation deploy --no-fail-on-empty-changeset \
        --template-file ../Infrastructure/Secrets.yaml \
        --stack-name biteroll-secrets \
        --parameter-overrides GoogleMapsApiKey="$GOOGLE_MAPS_API_KEY"

    EAST_SECRET_ARN=$(aws cloudformation list-exports \
        --query "Exports[?Name=='SecretsARN'].Value" \
        --output text)
}

prepare_cloudtrail_bucket_name() {
    local account_id

    if aws cloudformation describe-stacks \
        --stack-name biteroll-cloudtrail \
        >/dev/null 2>&1; then
        return
    fi

    if ! aws s3api head-bucket \
        --bucket "$CLOUDTRAIL_BUCKET_NAME" \
        >/dev/null 2>&1; then
        return
    fi

    account_id=$(aws sts get-caller-identity --query Account --output text)
    CLOUDTRAIL_BUCKET_NAME="biteroll-cloudtrail-logs-sawyer-$account_id"
    echo "Default CloudTrail log bucket already exists outside this stack; using $CLOUDTRAIL_BUCKET_NAME."
}

echo "[ 1/17 ] Cognito"
aws cloudformation deploy --no-fail-on-empty-changeset \
    --template-file ../Infrastructure/Cognito.yaml \
    --stack-name biteroll-cognito

echo "[ 2/17 ] S3 Static Site"
aws cloudformation deploy --no-fail-on-empty-changeset \
    --template-file ../Infrastructure/S3-Static-Site.yaml \
    --stack-name biteroll-s3-static-site

echo "[ 3/17 ] GitHub Actions IAM"
aws cloudformation deploy --no-fail-on-empty-changeset \
    --template-file ../Infrastructure/GitHubActionsIAM.yaml \
    --stack-name biteroll-github-actions-iam \
    --capabilities CAPABILITY_NAMED_IAM

echo "[ 4/17 ] S3 Media"
aws cloudformation deploy --no-fail-on-empty-changeset \
    --template-file ../Infrastructure/S3-Media.yaml \
    --stack-name biteroll-s3-media \
    --capabilities CAPABILITY_NAMED_IAM

echo "[ 5/17 ] Secrets"
ensure_google_maps_secret

echo "[ 6/17 ] DynamoDB"
aws cloudformation deploy --no-fail-on-empty-changeset \
    --template-file ../Infrastructure/DynamoDB.yaml \
    --stack-name biteroll-DynamoDB

echo "[ 7/17 ] WAF"
aws cloudformation deploy --no-fail-on-empty-changeset \
    --template-file ../Infrastructure/WAF.yaml \
    --stack-name biteroll-waf \
    --region us-east-1

WAF_WEB_ACL_ARN=$(aws cloudformation list-exports \
    --region us-east-1 \
    --query "Exports[?Name=='BiteRollCloudFrontWebACLArn'].Value" \
    --output text)
if [ -z "$WAF_WEB_ACL_ARN" ] || [ "$WAF_WEB_ACL_ARN" = "None" ]; then
    echo "Could not resolve WAF Web ACL ARN from stack biteroll-waf"
    exit 1
fi

echo "[ 8/17 ] CloudFront"
aws cloudformation deploy --no-fail-on-empty-changeset \
    --template-file ../Infrastructure/CloudFront.yaml \
    --stack-name biteroll-cloudfront \
    --parameter-overrides WebACLArn="$WAF_WEB_ACL_ARN"

echo "[ 9/17 ] Bucket Policy"
aws cloudformation deploy --no-fail-on-empty-changeset \
    --template-file ../Infrastructure/BucketPolicy.yaml \
    --stack-name biteroll-s3-policy

DISTRIBUTION_ID=$(aws cloudformation describe-stack-resources \
    --stack-name biteroll-cloudfront \
    --logical-resource-id BiteRollCloudFront \
    --query "StackResources[0].PhysicalResourceId" \
    --output text)
if [ -z "$DISTRIBUTION_ID" ] || [ "$DISTRIBUTION_ID" = "None" ]; then
    echo "Could not resolve CloudFront distribution ID from stack biteroll-cloudfront"
    exit 1
fi
INVALIDATION_ID=$(aws cloudfront create-invalidation \
    --distribution-id "$DISTRIBUTION_ID" \
    --paths "/*" \
    --query "Invalidation.Id" \
    --output text \
    --no-cli-pager)
echo "Created CloudFront invalidation $INVALIDATION_ID"

echo "[ 10/17 ] Lambda"
cd ../lambda
zip lambda.zip lambda.py
aws s3 cp lambda.zip s3://biteroll-static-site-sawyer/lambda/lambda.zip
aws cloudformation deploy --no-fail-on-empty-changeset \
    --template-file ../Infrastructure/Lambda.yaml \
    --stack-name biteroll-lambda \
    --capabilities CAPABILITY_IAM \
    --parameter-overrides SecretsArn="$EAST_SECRET_ARN"
aws lambda update-function-code \
    --function-name biteroll-api \
    --s3-bucket biteroll-static-site-sawyer \
    --s3-key lambda/lambda.zip \
    --query "LastUpdateStatus" \
    --output text \
    --no-cli-pager

echo "[ 11/17 ] API Gateway"
cd "$SCRIPT_DIR"
aws cloudformation deploy --no-fail-on-empty-changeset \
    --template-file ../Infrastructure/APIGateway.yaml \
    --stack-name biteroll-api-gateway

echo "[ 12/17 ] West region backend and API"
bash "$SCRIPT_DIR/deploy-west.sh"
cd "$SCRIPT_DIR"

export VITE_COGNITO_USER_POOL_ID=$(aws cloudformation list-exports \
    --query "Exports[?Name=='CognitoUserPoolID'].Value" --output text)
export VITE_COGNITO_CLIENT_ID=$(aws cloudformation list-exports \
    --query "Exports[?Name=='CognitoUserPoolClient'].Value" --output text)
export VITE_API_BASE_URL=$(aws cloudformation list-exports \
    --query "Exports[?Name=='ApiInvokeUrl-us-east-2'].Value" --output text)

export VITE_API_FAILOVER_URL=$(aws cloudformation list-exports \
    --region us-west-2 \
    --query "Exports[?Name=='ApiInvokeUrl-us-west-2'].Value" --output text 2>/dev/null || echo "")

if [ -z "$VITE_COGNITO_USER_POOL_ID" ] || [ "$VITE_COGNITO_USER_POOL_ID" = "None" ] || \
   [ -z "$VITE_COGNITO_CLIENT_ID" ] || [ "$VITE_COGNITO_CLIENT_ID" = "None" ] || \
   [ -z "$VITE_API_BASE_URL" ] || [ "$VITE_API_BASE_URL" = "None" ]; then
    echo "Could not resolve one or more frontend environment values"
    exit 1
fi

if [ -z "$VITE_API_FAILOVER_URL" ] || [ "$VITE_API_FAILOVER_URL" = "None" ]; then
    echo "WARNING: us-west-2 API Gateway not found; client-side failover disabled"
    VITE_API_FAILOVER_URL=""
fi

echo "VITE_COGNITO_USER_POOL_ID=$VITE_COGNITO_USER_POOL_ID" > ../frontend/.env
echo "VITE_COGNITO_CLIENT_ID=$VITE_COGNITO_CLIENT_ID" >> ../frontend/.env
echo "VITE_API_BASE_URL=$VITE_API_BASE_URL" >> ../frontend/.env
echo "VITE_API_FAILOVER_URL=$VITE_API_FAILOVER_URL" >> ../frontend/.env

echo "[ 13/17 ] Frontend build and sync"
cd ../frontend
npm ci
npm run build
aws s3 sync dist s3://biteroll-static-site-sawyer/ --delete --exclude "lambda/*"

echo "[ 14/17 ] SNS"
cd "$SCRIPT_DIR"
aws cloudformation deploy --no-fail-on-empty-changeset \
    --template-file ../Infrastructure/SNSTopic.yaml \
    --stack-name biteroll-sns-topic \
    --parameter-overrides AlertEmail=sawyerals.nh@gmail.com

echo "[ 15/17 ] CloudWatch"
aws cloudformation deploy --no-fail-on-empty-changeset \
    --template-file ../Infrastructure/CloudWatch.yaml \
    --stack-name biteroll-cloudwatch

echo "[ 16/17 ] CloudTrail"
prepare_cloudtrail_bucket_name
aws cloudformation deploy --no-fail-on-empty-changeset \
    --template-file ../Infrastructure/CloudTrail.yaml \
    --stack-name biteroll-cloudtrail \
    --parameter-overrides CloudTrailBucketName="$CLOUDTRAIL_BUCKET_NAME"

echo "[ 17/17 ] Budget"
aws cloudformation deploy --no-fail-on-empty-changeset \
    --template-file ../Infrastructure/Budget.yaml \
    --stack-name biteroll-budget \
    --parameter-overrides AlertEmail=sawyerals.nh@gmail.com

echo ""
echo "Deploy complete."
echo ""
cd "$SCRIPT_DIR"
bash "$SCRIPT_DIR/status.sh"
