# BiteRoll Well-Architected Pillars

## Operational Excellence

- Infrastructure is managed with CloudFormation templates in `Infrastructure/`.
- `scripts/deploy.sh` automates the main deployment flow.
- `scripts/deploy.sh` fails fast and reports the failed line and exit code.
- `scripts/status.sh` checks deployed resource health after deployment.
- GitHub Actions builds the frontend on pull requests.
- GitHub Actions invalidates CloudFront after frontend deployments.
- Lambda emits structured JSON logs to CloudWatch.
- Frontend logs key user workflows such as login, geolocation, feed loading, menu loading, likes, and failures.
- CloudWatch alarms monitor Lambda errors, Lambda throttles, Lambda duration, API Gateway 4XX/5XX errors, and API Gateway latency.
- SNS sends operational alarm notifications.
- CloudTrail records AWS account activity for post-incident investigation.

## Security

- Cognito provides user signup, login, email confirmation, and session management.
- `/feed` is protected in React by `ProtectedRoute`.
- API Gateway uses a Cognito authorizer for `/feed`, `/menu`, and `/like`.
- API calls require a Cognito ID token in the `Authorization` header.
- S3 static and media buckets block public access.
- CloudFront Origin Access Control is used so S3 content is served through CloudFront instead of direct public bucket access.
- S3 bucket policies restrict object reads to CloudFront.
- Google Maps API key is stored in Secrets Manager.
- Lambda IAM permissions are scoped to DynamoDB, Secrets Manager, and CloudWatch logging.
- GitHub Actions deploy permissions are scoped to S3 sync, CloudFront invalidation, and required CloudFormation lookups.
- CloudTrail stores AWS management event logs in a private encrypted S3 bucket.
- Logs avoid passwords, tokens, confirmation codes, API keys, raw Google responses, and exact user coordinates.

## Reliability

- Compute is stateless through Lambda and API Gateway.
- Persistent state is isolated in managed services: DynamoDB and S3.
- CloudFormation makes infrastructure repeatable and recoverable.
- CloudFront provides stable global delivery for frontend and media assets.
- CloudFront SPA error responses send 403/404 routes back to `index.html`.
- Lambda validates required request parameters and returns controlled `400` responses.
- Lambda returns explicit `404` responses for missing restaurants, menus, and unknown paths.
- Frontend handles loading, empty feed, geolocation failure, menu loading, and menu failure states.
- CloudWatch alarms detect backend errors, throttles, latency, and API failure spikes.
- `status.sh` checks CloudFormation stack status and alarm state.
- S3 media bucket has versioning enabled.
- S3 media bucket has Cross-Region Replication configured to the west media bucket.

## Performance Efficiency

- CloudFront caches static frontend assets.
- CloudFront caches `/assets/*` with an optimized cache policy.
- CloudFront caches `/media/*` with an optimized cache policy.
- CloudFront redirects HTTP traffic to HTTPS.
- Vite builds optimized production frontend assets.
- Lambda provides request-based compute instead of always-on servers.
- DynamoDB uses `PAY_PER_REQUEST` billing for automatic request scaling.
- Frontend lets users choose a search radius.
- Lambda clamps Google Places radius to avoid excessive external API calls.
- CloudWatch monitors Lambda duration and API Gateway latency.
- CloudFront invalidations ensure users receive updated frontend assets after deployment.

## Cost Optimization

- BiteRoll uses serverless and managed services instead of always-on EC2 servers.
- S3 hosts the static frontend at low cost.
- CloudFront reduces repeated S3 origin requests.
- Lambda charges only when API requests execute.
- DynamoDB uses `PAY_PER_REQUEST` instead of provisioned capacity.
- CloudWatch logs avoid large raw payloads to reduce log volume.
- CloudTrail logs expire after 90 days through S3 lifecycle policy.
- `Infrastructure/Budget.yaml` creates a `$1/month` AWS Budget.
- Budget alerts trigger at 50% actual spend.
- Budget alerts trigger at 80% actual spend.
- Budget alerts trigger at 100% forecasted spend.
- Cost controls are deployed through CloudFormation instead of only being manually configured.

## Redundancy And Scalability

- CloudFront provides global edge delivery for static frontend and media content.
- S3 provides durable managed storage for frontend and media assets.
- Media bucket versioning protects against accidental overwrite/delete issues.
- Media bucket Cross-Region Replication copies media objects to `us-west-2`.
- `deploy-west.sh` supports deploying a secondary Lambda/API Gateway backend in `us-west-2`.
- `Lambda.yaml` accepts parameters for west-region DynamoDB ARN, Secrets Manager ARN, and Lambda code bucket.
- `deploy-west.sh` creates/uses a west-region Lambda code bucket.
- DynamoDB uses on-demand capacity to scale with traffic.
- Lambda scales horizontally per request without managing servers.
- API Gateway provides managed request handling in front of Lambda.
- Stateless compute design makes regional redeployment easier.
- Route 53 latency routing is documented as optional for a future custom-domain multi-region setup.


