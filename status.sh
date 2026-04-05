#!/bin/bash

echo "========================="
echo "     Resource Status"
echo "========================="


aws resourcegroupstaggingapi get-resources --tag-filters \
    Key=Project,Values=BiteRoll \
    --query 'ResourceTagMappingList[*].{ARN:ResourceARN}' \
    --output table \


