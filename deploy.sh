#!/bin/bash

aws cloudformation deploy \
    --template-file S3-Static-Site.yaml \
    --stack-name biteroll-s3-static-site

aws cloudformation deploy \
    --template-file CloudFront.yaml \
    --stack-name biteroll-cloudfront

aws cloudformation deploy \
    --template-file BucketPolicy.yaml \
    --stack-name biteroll-s3-policy