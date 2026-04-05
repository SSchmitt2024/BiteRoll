#!/bin/bash

aws cloudformation deploy \
    --template-file S3-Static-Site.yaml \
    --stack-name biteroll-s3-static-site
aws s3 cp index.html s3://biteroll-static-site-sawyer/ #attaches index.html to bucket

aws cloudformation deploy \
    --template-file CloudFront.yaml \
    --stack-name biteroll-cloudfront

aws cloudformation deploy \
    --template-file BucketPolicy.yaml \
    --stack-name biteroll-s3-policy

aws cloudformation deploy \
    --template-file Cognito.yaml \
    --stack-name biteroll-cognito

echo ""
./status.sh

