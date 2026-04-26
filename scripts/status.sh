#!/bin/bash

echo -e "========================="
echo -e "     Resource Status"
echo -e "=========================\n"


aws resourcegroupstaggingapi get-resources --tag-filters \
    Key=Project,Values=BiteRoll \
    --query 'ResourceTagMappingList[*].{ARN:ResourceARN}' \
    --output table

declare -A resources

echo -e "\n[ ===== Bucket Status ===== ]"
aws s3api head-bucket --bucket biteroll-static-site-sawyer
S3_Status=$?
resources["S3"]=$S3_Status

echo -e "\n[ === CloudFront Status === ]"
CF_DISTRIBUTION_ID=$(aws cloudformation describe-stack-resources \
    --stack-name biteroll-cloudfront \
    --logical-resource-id BiteRollCloudFront \
    --query "StackResources[0].PhysicalResourceId" \
    --output text)
if [ -z "$CF_DISTRIBUTION_ID" ] || [ "$CF_DISTRIBUTION_ID" = "None" ]; then
    echo "Could not resolve CloudFront distribution ID from stack biteroll-cloudfront"
    CF_Status=1
else
    aws cloudfront get-distribution --id "$CF_DISTRIBUTION_ID" \
        --query 'Distribution.{Status:Status,Domain:DomainName}' \
        --output table
    CF_Status=$?
fi
resources["CloudFront"]=$CF_Status

echo -e "\n[ ===== Cognito Status ===== ]"
aws cloudformation describe-stacks \
    --stack-name biteroll-cognito \
    --query 'Stacks[0].StackStatus' \
    --output text
COG_Status=$?
resources["Cognito"]=$COG_Status

echo -e "\n[ ===== Lambda Status ===== ]"
aws cloudformation describe-stacks \
    --stack-name biteroll-lambda \
    --query 'Stacks[0].StackStatus' \
    --output text
LAMBDA_Status=$?
resources["Lambda"]=$LAMBDA_Status

echo -e "\n[ === API Gateway Status === ]"
aws cloudformation describe-stacks \
    --stack-name biteroll-api-gateway \
    --query 'Stacks[0].StackStatus' \
    --output text
API_Status=$?
resources["APIGateway"]=$API_Status

echo -e "\n[ ====== SNS Status ======= ]"
aws cloudformation describe-stacks \
    --stack-name biteroll-sns-topic \
    --query 'Stacks[0].StackStatus' \
    --output text
SNS_Status=$?
resources["SNS"]=$SNS_Status

echo -e "\n[ === CloudWatch Status === ]"
aws cloudformation describe-stacks \
    --stack-name biteroll-cloudwatch \
    --query 'Stacks[0].StackStatus' \
    --output text
CW_Status=$?
resources["CloudWatch"]=$CW_Status

aws cloudwatch describe-alarms \
    --alarm-names \
        BiteRoll-Lambda-Errors \
        BiteRoll-Lambda-Throttles \
        BiteRoll-Lambda-Duration \
        BiteRoll-APIGW-5xx \
        BiteRoll-APIGW-4xx \
        BiteRoll-APIGW-Latency \
    --query 'MetricAlarms[*].{Alarm:AlarmName,State:StateValue}' \
    --output table

echo -e "\n[ === CloudTrail Status === ]"
aws cloudformation describe-stacks \
    --stack-name biteroll-cloudtrail \
    --query 'Stacks[0].StackStatus' \
    --output text
CT_Status=$?
resources["CloudTrail"]=$CT_Status

aws cloudtrail get-trail-status \
    --name biteroll-management-events \
    --query '{Logging:IsLogging,LatestDeliveryError:LatestDeliveryError,LatestDeliveryTime:LatestDeliveryTime}' \
    --output table

echo -e "\n[ ===== Budget Status ===== ]"
aws cloudformation describe-stacks \
    --stack-name biteroll-budget \
    --query 'Stacks[0].StackStatus' \
    --output text
BUDGET_Status=$?
resources["Budget"]=$BUDGET_Status

ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
aws budgets describe-budget \
    --account-id "$ACCOUNT_ID" \
    --budget-name BiteRoll-Monthly-1USD \
    --query 'Budget.{Name:BudgetName,Limit:BudgetLimit.Amount,Unit:BudgetLimit.Unit,TimeUnit:TimeUnit}' \
    --output table

#==============================================================================
echo ""
issues=0

echo -e "\n[ ==== General Status ==== ]\n"

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
