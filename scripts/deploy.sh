#!/bin/bash

set -e

aws cloudformation deploy \
    --template-file ../Infrastructure/Cognito.yaml \
    --stack-name biteroll-cognito

export VITE_COGNITO_USER_POOL_ID=$(aws cloudformation list-exports \
    --query "Exports[?Name=='CognitoUserPoolID'].Value" --output text)
export VITE_COGNITO_CLIENT_ID=$(aws cloudformation list-exports \
    --query "Exports[?Name=='CognitoUserPoolClient'].Value" --output text)

echo "VITE_COGNITO_USER_POOL_ID=$VITE_COGNITO_USER_POOL_ID" > ../frontend/.env
echo "VITE_COGNITO_CLIENT_ID=$VITE_COGNITO_CLIENT_ID" >> ../frontend/.env

cd ../frontend
npm ci
npm run build

aws cloudformation deploy \
    --template-file ../Infrastructure/S3-Static-Site.yaml \
    --stack-name biteroll-s3-static-site
aws s3 sync dist s3://biteroll-static-site-sawyer/ --delete

aws cloudformation deploy \
    --template-file ../Infrastructure/BucketPolicy.yaml \
    --stack-name biteroll-s3-policy

aws cloudformation deploy \
    --template-file ../Infrastructure/CloudFront.yaml \
    --stack-name biteroll-cloudfront


echo ""
cd ../scripts
./status.sh

