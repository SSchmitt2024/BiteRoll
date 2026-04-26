# BiteRoll Well-Architected Pillars

## Overall Grade: 46/50

- Security: 9/10
- Reliability: 8/10
- Performance Efficiency: 9/10
- Operational Excellence: 10/10
- Cost Optimization: 10/10

## Security - 9/10

- Cognito handles signup, login, email confirmation, and protected frontend routes.
- Cognito password policy requires uppercase, lowercase, numbers, symbols, and minimum length.
- Static and media S3 buckets block public access.
- CloudFront uses Origin Access Control so users access S3 through CloudFront instead of directly.
- Bucket policies only allow CloudFront to read S3 objects.
- Google Maps API key is stored in Secrets Manager instead of frontend code.
- Lambda IAM role is scoped to DynamoDB access, Secrets Manager access, and CloudWatch logging.
- GitHub Actions IAM policy is limited to frontend deploy actions.
- CloudTrail records AWS account/control-plane activity for forensic investigation.
- Logs avoid passwords, tokens, API keys, confirmation codes, raw Google responses, and exact user coordinates.
- Gap: API Gateway endpoints still use `AuthorizationType: NONE`; adding a Cognito authorizer would make this stronger.

## Reliability - 8/10

- Compute layer is stateless through Lambda and API Gateway.
- Persistent state is isolated in managed services: DynamoDB and S3.
- CloudFront provides stable global delivery for frontend and media assets.
- CloudFormation templates make infrastructure repeatable.
- `deploy.sh` stops on failures and reports the failed line.
- Lambda validates required query parameters and returns `400` instead of crashing.
- Lambda returns explicit `404` responses for missing restaurants, menus, and unknown paths.
- Frontend handles loading, empty feed, geolocation failure, menu loading, and menu failure states.
- CloudWatch alarms detect Lambda errors, throttles, duration issues, API 5XX errors, API 4XX spikes, and API latency.
- `status.sh` checks major deployed resources and alarm states.
- Gap: DynamoDB PITR, S3 versioning, and retry/backoff are not yet implemented.

## Performance Efficiency - 9/10

- CloudFront caches static frontend assets.
- CloudFront caches `/assets/*` with an optimized cache policy.
- CloudFront caches `/media/*` with an optimized cache policy.
- CloudFront redirects HTTP to HTTPS.
- Vite builds optimized production frontend assets.
- Lambda provides request-based compute without always-on servers.
- DynamoDB uses `PAY_PER_REQUEST` billing for automatic request scaling.
- Frontend lets users choose a search radius.
- Lambda clamps Google Places radius to avoid excessive external API requests.
- CloudWatch monitors Lambda duration and API Gateway latency.
- Gap: Lambda still uses a DynamoDB `scan()` fallback, which is acceptable for demo scale but not ideal for large-scale location search.

## Operational Excellence - 10/10

- Infrastructure is defined with CloudFormation templates.
- `deploy.sh` automates full deployment order across Cognito, S3, CloudFront, DynamoDB, Lambda, API Gateway, SNS, CloudWatch, CloudTrail, and Budget.
- `deploy.sh` has fail-fast behavior and reports failed line/exit code.
- GitHub Actions builds frontend on pull requests.
- GitHub Actions deploys frontend to S3 on pushes to `main`.
- GitHub Actions invalidates CloudFront after frontend deploys.
- `status.sh` checks S3, CloudFront, Cognito, Lambda, API Gateway, SNS, CloudWatch, CloudTrail, and Budget.
- Lambda emits structured JSON logs to CloudWatch.
- Frontend logs key user-visible workflows during development and debugging.
- CloudWatch alarms publish operational alerts through SNS.
- `docs/operational-logging.md` documents logging events and monitoring coverage.

## Cost Optimization - 10/10

- App uses serverless/managed services instead of always-on EC2 servers.
- S3 hosts static frontend assets cheaply.
- CloudFront reduces repeated S3 origin requests.
- Lambda charges only when API requests execute.
- DynamoDB uses `PAY_PER_REQUEST` instead of provisioned capacity.
- CloudWatch logs avoid large raw payloads to reduce log volume.
- CloudTrail logs expire after 90 days through S3 lifecycle policy.
- `Infrastructure/Budget.yaml` creates a $1/month AWS Budget.
- Budget alerts trigger at 50% actual spend.
- Budget alerts trigger at 80% actual spend.
- Budget alerts trigger at 100% forecasted spend.
- Cost monitoring is automated through CloudFormation instead of only manual console setup.

## HONORS

1. DynamoDB Global Tables
Changed the CloudFormation resource type from AWS::DynamoDB::Table to AWS::DynamoDB::GlobalTable and added a Replicas array listing us-east-2 and us-west-2. DynamoDB handles the rest — any write to either region automatically syncs to the other. We had to delete and recreate the table because CloudFormation can't convert in-place.
2. S3 Cross-Region Replication
Created a destination bucket (biteroll-media-sawyer-west) in us-west-2 via the S3-Media-West.yaml template. The replication rule on the source bucket copies new objects to the west bucket automatically. This ensures media is available even if us-east-2 goes down.
3. Route 53 Latency-Based Routing
Deployed identical API Gateway + Lambda stacks in both regions, each with a regional custom domain (api.sawyerschmitt.dev). Created two Route 53 A records for the same domain, each with a different Region and SetIdentifier. When a user makes a request, Route 53 measures which region has lower latency from the user's location and routes them there automatically.