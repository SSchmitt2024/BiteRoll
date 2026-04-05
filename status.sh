#!/bin/bash

echo -e "========================="
echo -e "     Resource Status"
echo -e "=========================\n"


aws resourcegroupstaggingapi get-resources --tag-filters \
    Key=Project,Values=BiteRoll \
    --query 'ResourceTagMappingList[*].{ARN:ResourceARN}' \
    --output table \

declare -A resources

echo -e "\n[ ===== Bucket Status ===== ]"
aws s3api head-bucket --bucket biteroll-static-site-sawyer
S3_Status=$?
resources["S3"]=$S3_Status

echo -e "\n[ === CloudFront Status === ]"
aws cloudfront get-distribution --id E3A0HS1T7YS44D \
    --query 'Distribution.{Status:Status,Domain:DomainName}' \
    --output table
CF_Status=$?
resources["CloudFront"]=$CF_Status

echo ""
issues=0

for resource in "${!resources[@]}"; do
    if [ ${resources[$resource]} -eq 0 ]; then
        echo "$resource : Running"
    else
        echo "$resource : ERROR"
        issues=1
    fi
done

if [ $issues -eq 1 ]; then
    echo -e "\nResources not fully up and running.\n"
else
    echo -e "\nResources fully up and running.\n"
fi

