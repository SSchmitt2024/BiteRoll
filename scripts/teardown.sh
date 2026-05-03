#!/bin/bash
# Tears down non-stateful BiteRoll infrastructure.
# Preserves DynamoDB, Cognito, Secrets Manager, media buckets, CloudTrail, and CI deploy IAM by default.

set -euo pipefail
export AWS_PAGER=""

PRIMARY_REGION="${PRIMARY_REGION:-us-east-2}"
WEST_REGION="${WEST_REGION:-us-west-2}"
STATIC_BUCKET="${STATIC_BUCKET:-biteroll-static-site-sawyer}"
WEST_LAMBDA_BUCKET="${WEST_LAMBDA_BUCKET:-biteroll-lambda-code-west}"

YES=false
DRY_RUN=false
DELETE_GITHUB_ACTIONS_IAM=false
DELETE_CLOUDTRAIL=false

usage() {
    cat <<EOF
Usage: $(basename "$0") [--yes] [--dry-run] [--delete-github-actions-iam] [--delete-cloudtrail]

Deletes non-stateful BiteRoll resources from $PRIMARY_REGION and $WEST_REGION.

Preserved by default:
  - biteroll-DynamoDB ($PRIMARY_REGION)
  - biteroll-cognito ($PRIMARY_REGION)
  - biteroll-secrets ($PRIMARY_REGION, if deployed)
  - biteroll-s3-media ($PRIMARY_REGION)
  - biteroll-s3-media-west ($WEST_REGION)
  - biteroll-cloudtrail ($PRIMARY_REGION)
  - biteroll-github-actions-iam ($PRIMARY_REGION)
  - biteroll/google-maps-api-key secrets

Options:
  --yes                        Run without the confirmation prompt.
  --dry-run                    Print what would be deleted without deleting it.
  --delete-github-actions-iam  Also delete the CI deploy IAM stack.
  --delete-cloudtrail          Also delete the CloudTrail stack. Its log bucket is retained.
  --help                       Show this help text.
EOF
}

while [ $# -gt 0 ]; do
    case "$1" in
        --yes|-y)
            YES=true
            ;;
        --dry-run)
            DRY_RUN=true
            ;;
        --delete-github-actions-iam)
            DELETE_GITHUB_ACTIONS_IAM=true
            ;;
        --delete-cloudtrail)
            DELETE_CLOUDTRAIL=true
            ;;
        --help|-h)
            usage
            exit 0
            ;;
        *)
            echo "Unknown option: $1"
            usage
            exit 2
            ;;
    esac
    shift
done

run() {
    echo "+ $*"
    if [ "$DRY_RUN" = false ]; then
        "$@"
    fi
}

stack_exists() {
    local stack_name="$1"
    local region="$2"

    aws cloudformation describe-stacks \
        --stack-name "$stack_name" \
        --region "$region" \
        >/dev/null 2>&1
}

delete_stack() {
    local stack_name="$1"
    local region="$2"

    if ! stack_exists "$stack_name" "$region"; then
        echo "Skipping missing stack $stack_name ($region)"
        return
    fi

    run aws cloudformation delete-stack \
        --stack-name "$stack_name" \
        --region "$region"

    run aws cloudformation wait stack-delete-complete \
        --stack-name "$stack_name" \
        --region "$region"
}

bucket_exists() {
    local bucket_name="$1"

    aws s3api head-bucket \
        --bucket "$bucket_name" \
        >/dev/null 2>&1
}

empty_bucket_if_exists() {
    local bucket_name="$1"
    local region="$2"

    if ! bucket_exists "$bucket_name"; then
        echo "Skipping missing bucket $bucket_name"
        return
    fi

    run aws s3 rm "s3://$bucket_name" \
        --recursive \
        --region "$region"
}

delete_bucket_if_exists() {
    local bucket_name="$1"
    local region="$2"

    empty_bucket_if_exists "$bucket_name" "$region"

    if ! bucket_exists "$bucket_name"; then
        return
    fi

    run aws s3 rb "s3://$bucket_name" \
        --force \
        --region "$region"
}

echo "This will delete non-stateful BiteRoll infrastructure."
echo ""
echo "Will delete stacks:"
echo "  $WEST_REGION: biteroll-api-gateway, biteroll-lambda"
echo "  $PRIMARY_REGION: biteroll-route53, biteroll-cloudwatch,"
echo "  $PRIMARY_REGION: biteroll-budget, biteroll-s3-policy, biteroll-api-gateway,"
echo "  $PRIMARY_REGION: biteroll-lambda, biteroll-cloudfront,"
echo "  $PRIMARY_REGION: biteroll-sns-topic, biteroll-s3-static-site"
if [ "$DELETE_CLOUDTRAIL" = true ]; then
    echo "  $PRIMARY_REGION: biteroll-cloudtrail"
fi
if [ "$DELETE_GITHUB_ACTIONS_IAM" = true ]; then
    echo "  $PRIMARY_REGION: biteroll-github-actions-iam"
fi
echo ""
echo "Will delete buckets:"
echo "  $WEST_REGION: $WEST_LAMBDA_BUCKET"
echo "  $PRIMARY_REGION: $STATIC_BUCKET through its CloudFormation stack"
echo ""
echo "Will preserve stateful stacks/resources:"
echo "  $PRIMARY_REGION: biteroll-DynamoDB, biteroll-cognito, biteroll-secrets, biteroll-s3-media"
echo "  $WEST_REGION: biteroll-s3-media-west"
if [ "$DELETE_CLOUDTRAIL" = false ]; then
    echo "  $PRIMARY_REGION: biteroll-cloudtrail"
fi
if [ "$DELETE_GITHUB_ACTIONS_IAM" = false ]; then
    echo "  $PRIMARY_REGION: biteroll-github-actions-iam"
fi
echo "  Secrets named biteroll/google-maps-api-key"
echo ""

if [ "$YES" = false ] && [ "$DRY_RUN" = false ]; then
    read -r -p "Type delete to continue: " confirmation
    if [ "$confirmation" != "delete" ]; then
        echo "Cancelled."
        exit 0
    fi
fi

echo ""
echo "[ 1/3 ] Deleting west non-stateful resources"
delete_stack biteroll-api-gateway "$WEST_REGION"
delete_stack biteroll-lambda "$WEST_REGION"
delete_bucket_if_exists "$WEST_LAMBDA_BUCKET" "$WEST_REGION"

echo ""
echo "[ 2/3 ] Deleting primary non-stateful stacks"
delete_stack biteroll-route53 "$PRIMARY_REGION"
delete_stack biteroll-cloudwatch "$PRIMARY_REGION"
if [ "$DELETE_CLOUDTRAIL" = true ]; then
    delete_stack biteroll-cloudtrail "$PRIMARY_REGION"
else
    echo "Preserving biteroll-cloudtrail ($PRIMARY_REGION)"
fi
delete_stack biteroll-budget "$PRIMARY_REGION"
delete_stack biteroll-s3-policy "$PRIMARY_REGION"
delete_stack biteroll-api-gateway "$PRIMARY_REGION"
delete_stack biteroll-lambda "$PRIMARY_REGION"
delete_stack biteroll-cloudfront "$PRIMARY_REGION"
if [ "$DELETE_GITHUB_ACTIONS_IAM" = true ]; then
    delete_stack biteroll-github-actions-iam "$PRIMARY_REGION"
else
    echo "Preserving biteroll-github-actions-iam ($PRIMARY_REGION)"
fi
delete_stack biteroll-sns-topic "$PRIMARY_REGION"

echo ""
echo "[ 3/3 ] Emptying static assets and deleting static site stack"
empty_bucket_if_exists "$STATIC_BUCKET" "$PRIMARY_REGION"
delete_stack biteroll-s3-static-site "$PRIMARY_REGION"

echo ""
echo "Teardown complete. Stateful BiteRoll resources were preserved."
