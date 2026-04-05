#!/bin/bash

echo -e "========================="
echo -e "     Resource Status"
echo -e "=========================\n"


aws resourcegroupstaggingapi get-resources --tag-filters \
    Key=Project,Values=BiteRoll \
    --query 'ResourceTagMappingList[*].{ARN:ResourceARN}' \
    --output table \


echo -e "\n[ ===== Bucket Status ===== ]"
aws s3api head-bucket --bucket biteroll-static-site-sawyer

echo -e "\n[ === CloudFront Status === ]"
aws cloudfront list-distributions \
    --query 'DistributionList.Items[*].{Status:Status,Enabled:Enabled,Domain:DomainName}' \
    --output table