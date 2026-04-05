#!/bin/bash

echo "========================="
echo "     Resource Status"
echo "========================="


aws resourcegroupstaggingapi get-resources --tag-filters \
    Key=Project,Values=BiteRoll \
    --query 'ResourceTagMappingList[*].{ARN:ResourceARN}' \
    --output table \


echo "[ ===== Bucket Status ===== ]"
aws s3api head-bucket --bucket biteroll-static-site-sawyer

echo "[ === CloudFront Status === ]"
aws cloudfront list-distributions \
    --query 'DistributionList.Items[*].{Status:Status,Enabled:Enabled,Domain:DomainName}' \
    --output table