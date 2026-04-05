#!/bin/bash

echo -e "========================="
echo -e "     Resource Status"
echo -e "=========================\n"


aws resourcegroupstaggingapi get-resources --tag-filters \
    Key=Project,Values=BiteRoll \
    --query 'ResourceTagMappingList[*].{ARN:ResourceARN}' \
    --output table \

declar -A resources

echo -e "\n[ ===== Bucket Status ===== ]"
aws s3api head-bucket --bucket biteroll-static-site-sawyer
S3_Status = $?
resources["S3"] = $S3_Status

echo -e "\n[ === CloudFront Status === ]"
aws cloudfront list-distributions \
    --query 'DistributionList.Items[*].{Status:Status,Enabled:Enabled,Domain:DomainName}' \
    --output table
CF_Status = $?
resources["CloudFront"] = $CF_Status

for resource in "${!resources[@]}"; do
    if [ ${resources[$resource]} -eq 0 ]; then
        echo "$resource : Running"
    else
        echo "$resource : ERROR"
    fi
done

