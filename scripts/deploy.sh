#!/bin/bash

success=1

aws cloudformation deploy \
    --template-file ../Infrastructure/S3-Static-Site.yaml \
    --stack-name biteroll-s3-static-site
success=$?
aws s3 cp ../frontend/index.html s3://biteroll-static-site-sawyer/ #attaches index.html to bucket
success=$?

aws cloudformation deploy \
    --template-file ../Infrastructure/CloudFront.yaml \
    --stack-name biteroll-cloudfront
success=$?

aws cloudformation deploy \
    --template-file ../Infrastructure/BucketPolicy.yaml \
    --stack-name biteroll-s3-policy
success=$?

aws cloudformation deploy \
    --template-file ../Infrastructure/Cognito.yaml \
    --stack-name biteroll-cognito
success=$?

if [ $success -eq 1 ]; then
    echo -e "\nResources Deployed Successfully.\n"
else
    echo -e "\nResources Failed to Deployed.\n"
fi
./status.sh