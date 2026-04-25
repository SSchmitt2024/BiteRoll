#!/bin/bash

set -e
trap 'echo ""; echo "DEPLOY FAILED at line $LINENO (exit code $?)"; exit 1' ERR

echo "[ 1/10 ] Cognito"
aws cloudformation deploy \
    --template-file ../Infrastructure/Cognito.yaml \
    --stack-name biteroll-cognito

export VITE_COGNITO_USER_POOL_ID=$(aws cloudformation list-exports \
    --query "Exports[?Name=='CognitoUserPoolID'].Value" --output text)
export VITE_COGNITO_CLIENT_ID=$(aws cloudformation list-exports \
    --query "Exports[?Name=='CognitoUserPoolClient'].Value" --output text)

echo "VITE_COGNITO_USER_POOL_ID=$VITE_COGNITO_USER_POOL_ID" > ../frontend/.env
echo "VITE_COGNITO_CLIENT_ID=$VITE_COGNITO_CLIENT_ID" >> ../frontend/.env

echo "[ 2/10 ] Frontend build"
cd ../frontend
npm ci
npm run build

echo "[ 3/10 ] S3 Static Site"
aws cloudformation deploy \
    --template-file ../Infrastructure/S3-Static-Site.yaml \
    --stack-name biteroll-s3-static-site
aws s3 sync dist s3://biteroll-static-site-sawyer/ --delete --exclude "lambda/*"

echo "[ 4/10 ] S3 Media"
aws cloudformation deploy \
    --template-file ../Infrastructure/S3-Media.yaml \
    --stack-name biteroll-s3-media

echo "[ 5/10 ] Bucket Policy"
aws cloudformation deploy \
    --template-file ../Infrastructure/BucketPolicy.yaml \
    --stack-name biteroll-s3-policy

echo "[ 6/10 ] CloudFront"
aws cloudformation deploy \
    --template-file ../Infrastructure/CloudFront.yaml \
    --stack-name biteroll-cloudfront

DISTRIBUTION_ARN=$(aws cloudformation list-exports \
    --query "Exports[?Name=='CloudFrontDistributionId'].Value" --output text)
DISTRIBUTION_ID=${DISTRIBUTION_ARN##*/}
aws cloudfront create-invalidation --distribution-id $DISTRIBUTION_ID --paths "/*"

echo "[ 7/10 ] DynamoDB"
aws cloudformation deploy \
    --template-file ../Infrastructure/DynamoDB.yaml \
    --stack-name biteroll-DynamoDB

echo "[ 8/10 ] Lambda"
cd ../lambda
zip lambda.zip lambda.py
aws s3 cp lambda.zip s3://biteroll-static-site-sawyer/lambda/lambda.zip
aws cloudformation deploy \
    --template-file ../Infrastructure/Lambda.yaml \
    --stack-name biteroll-lambda \
    --capabilities CAPABILITY_IAM
aws lambda update-function-code \
    --function-name biteroll-api \
    --s3-bucket biteroll-static-site-sawyer \
    --s3-key lambda/lambda.zip

echo "[ 9/10 ] API Gateway"
aws cloudformation deploy \
    --template-file ../Infrastructure/APIGateway.yaml \
    --stack-name biteroll-api-gateway

echo "[ 10/10 ] SNS"
aws cloudformation deploy \
    --template-file ../Infrastructure/SNSTopic.yaml \
    --stack-name biteroll-sns-topic \
    --parameter-overrides AlertEmail=sawyerals.nh@gmail.com

echo ""
cd ../scripts
./status.sh
