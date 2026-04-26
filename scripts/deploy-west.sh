#!/bin/bash
# Deploys Lambda + API Gateway to us-west-2.
# Run this AFTER the main deploy.sh has completed successfully.
# Set API_DOMAIN and CERT_ARN_WEST before running if you have a custom domain ready.

set -e
export AWS_PAGER=""
export AWS_DEFAULT_REGION=us-west-2
trap 'status=$?; line=$LINENO; echo ""; echo "WEST DEPLOY FAILED at line $line (exit code $status)"; exit $status' ERR

# Optional: set these once you have ACM cert in us-west-2
API_DOMAIN="${API_DOMAIN:-}"
CERT_ARN_WEST="${CERT_ARN_WEST:-}"

echo "[ 1/4 ] S3 Media destination bucket (us-west-2)"
aws cloudformation deploy --no-fail-on-empty-changeset \
    --template-file ../Infrastructure/S3-Media-West.yaml \
    --stack-name biteroll-s3-media-west \
    --region us-west-2

echo "[ 1.5/4 ] Lambda code bucket (us-west-2)"
aws s3 mb s3://biteroll-lambda-code-west --region us-west-2 2>/dev/null || true

echo "[ 2/4 ] Secrets (us-west-2) — copy Google Maps key to west region"
GOOGLE_KEY=$(aws secretsmanager get-secret-value \
    --secret-id biteroll/google-maps-api-key \
    --region us-east-2 \
    --query SecretString \
    --output text)
aws secretsmanager describe-secret \
    --secret-id biteroll/google-maps-api-key \
    --region us-west-2 > /dev/null 2>&1 || \
aws secretsmanager create-secret \
    --name biteroll/google-maps-api-key \
    --secret-string "$GOOGLE_KEY" \
    --region us-west-2

WEST_SECRET_ARN=$(aws secretsmanager describe-secret \
    --secret-id biteroll/google-maps-api-key \
    --region us-west-2 \
    --query "ARN" --output text)

echo "[ 3/4 ] Lambda (us-west-2)"
cd ../lambda
zip lambda.zip lambda.py
aws s3 cp lambda.zip s3://biteroll-lambda-code-west/lambda/lambda.zip --region us-west-2
aws cloudformation deploy --no-fail-on-empty-changeset \
    --template-file ../Infrastructure/Lambda.yaml \
    --stack-name biteroll-lambda \
    --capabilities CAPABILITY_IAM \
    --region us-west-2 \
    --parameter-overrides \
      DynamoDBTableArn=arn:aws:dynamodb:us-west-2:640706953694:table/BiteRollRestaurants \
      SecretsArn=$WEST_SECRET_ARN \
      LambdaCodeBucket=biteroll-lambda-code-west
aws lambda update-function-code \
    --function-name biteroll-api \
    --s3-bucket biteroll-lambda-code-west \
    --s3-key lambda/lambda.zip \
    --region us-west-2 \
    --query "LastUpdateStatus" \
    --output text \
    --no-cli-pager
    
echo "[ 4/4 ] API Gateway (us-west-2)"
cd ../scripts
PARAM_OVERRIDES=""
if [ -n "$API_DOMAIN" ] && [ -n "$CERT_ARN_WEST" ]; then
    PARAM_OVERRIDES="--parameter-overrides ApiDomainName=$API_DOMAIN RegionalCertArn=$CERT_ARN_WEST"
fi
aws cloudformation deploy --no-fail-on-empty-changeset \
    --template-file ../Infrastructure/APIGateway.yaml \
    --stack-name biteroll-api-gateway \
    --region us-west-2 \
    $PARAM_OVERRIDES

echo ""
echo "us-west-2 deploy complete."
if [ -n "$API_DOMAIN" ]; then
    EAST_DOMAIN=$(aws cloudformation list-exports \
        --region us-east-2 \
        --query "Exports[?Name=='ApiRegionalDomainName-us-east-2'].Value" \
        --output text)
    EAST_HZ=$(aws cloudformation list-exports \
        --region us-east-2 \
        --query "Exports[?Name=='ApiRegionalHostedZoneId-us-east-2'].Value" \
        --output text)
    WEST_DOMAIN=$(aws cloudformation list-exports \
        --region us-west-2 \
        --query "Exports[?Name=='ApiRegionalDomainName-us-west-2'].Value" \
        --output text)
    WEST_HZ=$(aws cloudformation list-exports \
        --region us-west-2 \
        --query "Exports[?Name=='ApiRegionalHostedZoneId-us-west-2'].Value" \
        --output text)
    CF_DOMAIN=$(aws cloudformation list-exports \
        --region us-east-2 \
        --query "Exports[?Name=='CloudFrontDomainName'].Value" \
        --output text)
    echo ""
    echo "Values for Route53.yaml parameters:"
    echo "  EastApiRegionalDomainName:  $EAST_DOMAIN"
    echo "  EastApiRegionalHostedZoneId: $EAST_HZ"
    echo "  WestApiRegionalDomainName:  $WEST_DOMAIN"
    echo "  WestApiRegionalHostedZoneId: $WEST_HZ"
    echo "  CloudFrontDomainName:       $CF_DOMAIN"
fi
