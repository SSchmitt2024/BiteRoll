#!/bin/bash

set -e
export AWS_PAGER=""
trap 'status=$?; line=$LINENO; echo ""; echo "DEPLOY FAILED at line $line (exit code $status)"; exit $status' ERR

echo "[ 1/14 ] Cognito"
aws cloudformation deploy --no-fail-on-empty-changeset \
    --template-file ../Infrastructure/Cognito.yaml \
    --stack-name biteroll-cognito

export VITE_COGNITO_USER_POOL_ID=$(aws cloudformation list-exports \
    --query "Exports[?Name=='CognitoUserPoolID'].Value" --output text)
export VITE_COGNITO_CLIENT_ID=$(aws cloudformation list-exports \
    --query "Exports[?Name=='CognitoUserPoolClient'].Value" --output text)

# Set VITE_API_BASE_URL to your custom domain once Route 53 is configured.
# Until then, keep the fallback pointing at the east API Gateway directly.
VITE_API_BASE_URL="${VITE_API_BASE_URL:-https://00bws6efnk.execute-api.us-east-2.amazonaws.com/prod}"

echo "VITE_COGNITO_USER_POOL_ID=$VITE_COGNITO_USER_POOL_ID" > ../frontend/.env
echo "VITE_COGNITO_CLIENT_ID=$VITE_COGNITO_CLIENT_ID" >> ../frontend/.env
echo "VITE_API_BASE_URL=$VITE_API_BASE_URL" >> ../frontend/.env

echo "[ 2/14 ] Frontend build"
cd ../frontend
npm ci
npm run build

echo "[ 3/14 ] S3 Static Site"
aws cloudformation deploy --no-fail-on-empty-changeset \
    --template-file ../Infrastructure/S3-Static-Site.yaml \
    --stack-name biteroll-s3-static-site
aws s3 sync dist s3://biteroll-static-site-sawyer/ --delete --exclude "lambda/*"

echo "[ 4/14 ] GitHub Actions IAM"
aws cloudformation deploy --no-fail-on-empty-changeset \
    --template-file ../Infrastructure/GitHubActionsIAM.yaml \
    --stack-name biteroll-github-actions-iam \
    --capabilities CAPABILITY_NAMED_IAM

echo "[ 5/14 ] S3 Media"
aws cloudformation deploy --no-fail-on-empty-changeset \
    --template-file ../Infrastructure/S3-Media.yaml \
    --stack-name biteroll-s3-media \
    --capabilities CAPABILITY_NAMED_IAM

echo "[ 6/14 ] CloudFront"
aws cloudformation deploy --no-fail-on-empty-changeset \
    --template-file ../Infrastructure/CloudFront.yaml \
    --stack-name biteroll-cloudfront

echo "[ 7/14 ] Bucket Policy"
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

echo "[ 8/14 ] DynamoDB"
aws cloudformation deploy --no-fail-on-empty-changeset \
    --template-file ../Infrastructure/DynamoDB.yaml \
    --stack-name biteroll-DynamoDB

echo "[ 9/14 ] Lambda"
cd ../lambda
zip lambda.zip lambda.py
aws s3 cp lambda.zip s3://biteroll-static-site-sawyer/lambda/lambda.zip
aws cloudformation deploy --no-fail-on-empty-changeset \
    --template-file ../Infrastructure/Lambda.yaml \
    --stack-name biteroll-lambda \
    --capabilities CAPABILITY_IAM
aws lambda update-function-code \
    --function-name biteroll-api \
    --s3-bucket biteroll-static-site-sawyer \
    --s3-key lambda/lambda.zip \
    --query "LastUpdateStatus" \
    --output text \
    --no-cli-pager

echo "[ 10/14 ] API Gateway"
aws cloudformation deploy --no-fail-on-empty-changeset \
    --template-file ../Infrastructure/APIGateway.yaml \
    --stack-name biteroll-api-gateway

echo "[ 11/14 ] SNS"
aws cloudformation deploy --no-fail-on-empty-changeset \
    --template-file ../Infrastructure/SNSTopic.yaml \
    --stack-name biteroll-sns-topic \
    --parameter-overrides AlertEmail=sawyerals.nh@gmail.com

echo "[ 12/14 ] CloudWatch"
aws cloudformation deploy --no-fail-on-empty-changeset \
    --template-file ../Infrastructure/CloudWatch.yaml \
    --stack-name biteroll-cloudwatch

echo "[ 13/14 ] CloudTrail"
aws cloudformation deploy --no-fail-on-empty-changeset \
    --template-file ../Infrastructure/CloudTrail.yaml \
    --stack-name biteroll-cloudtrail

echo "[ 14/14 ] Budget"
aws cloudformation deploy --no-fail-on-empty-changeset \
    --template-file ../Infrastructure/Budget.yaml \
    --stack-name biteroll-budget \
    --parameter-overrides AlertEmail=sawyerals.nh@gmail.com

echo ""
echo "Primary region deploy complete."
echo "Run scripts/deploy-west.sh to deploy Lambda + API Gateway to us-west-2."
echo ""
cd ../scripts
./status.sh
