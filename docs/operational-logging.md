# BiteRoll Operational Logging Map

This project logs operational events at the frontend and backend boundaries where failures affect users or deployed AWS resources.

## Backend: Lambda and CloudWatch

Lambda logs are structured JSON so CloudWatch Logs can be searched by `event`, `requestId`, `path`, `statusCode`, and resource identifiers such as `placeId`.

- `request_started`: API Gateway invoked Lambda.
- `request_completed`: Lambda returned a response with a status code.
- `request_validation_failed`: required query parameters were missing.
- `request_unknown_path`: API Gateway path did not match a supported route.
- `request_failed`: unexpected backend exception.
- `secret_fetch_started` / `secret_fetch_succeeded`: Google Maps API key retrieval from Secrets Manager.
- `google_places_request_started` / `google_places_request_succeeded`: Google Places dependency call.
- `feed_request_started`: feed request accepted.
- `feed_nearby_lookup_completed`: Google place IDs compared against DynamoDB records.
- `feed_seed_scan_started`: DynamoDB fallback scan started.
- `feed_request_succeeded`: feed response returned with result counts.
- `menu_request_started`: menu lookup accepted.
- `menu_request_not_found`: restaurant record missing.
- `menu_request_missing_url`: restaurant exists but has no menu URL.
- `menu_request_succeeded`: menu URL returned.
- `like_request_started`: like/unlike accepted.
- `like_unlike_skipped_zero_count`: unlike could not decrement below zero.
- `like_request_succeeded`: like/unlike stored.
- `like_request_failed`: DynamoDB update failed.

The backend avoids logging passwords, tokens, API keys, confirmation codes, raw Google responses, and exact user coordinates.

## CloudWatch Alarms

`Infrastructure/CloudWatch.yaml` creates alarms that publish to the SNS topic exported by `Infrastructure/SNSTopic.yaml`.

- `BiteRoll-Lambda-Errors`: Lambda returned at least one error in five minutes.
- `BiteRoll-Lambda-Throttles`: Lambda was throttled.
- `BiteRoll-Lambda-Duration`: Lambda average duration is approaching the 30 second timeout.
- `BiteRoll-APIGW-5xx`: API Gateway returned at least one server error in five minutes.
- `BiteRoll-APIGW-4xx`: API Gateway client errors are spiking.
- `BiteRoll-APIGW-Latency`: API Gateway average latency is high.

The deploy order is SNS first, then CloudWatch, so alarms have a notification topic to publish to.

## Frontend: Browser Console

Frontend logs help diagnose user-visible failures while developing or demoing the app.

- `protected_route_no_session`: user tried to access a protected route without a session.
- `protected_route_session_invalid`: stored Cognito session failed validation.
- `protected_route_session_valid`: protected route allowed.
- `login_started` / `login_succeeded` / `login_failed`: Cognito sign-in flow.
- `signup_started` / `signup_validation_failed` / `signup_succeeded` / `signup_failed`: Cognito signup flow.
- `email_confirmation_started` / `email_confirmation_succeeded` / `email_confirmation_failed`: confirmation flow.
- `geolocation_request_started` / `geolocation_request_succeeded` / `geolocation_request_failed`: browser location permission and result.
- `feed_request_started` / `feed_request_succeeded` / `feed_request_failed`: feed API request.
- `feed_swipe_started`: card navigation.
- `like_request_started` / `like_request_succeeded` / `like_request_failed`: optimistic like/unlike action.
- `menu_opened`: user opened the menu drawer.
- `menu_request_started` / `menu_request_succeeded` / `menu_request_failed`: menu lookup and menu JSON fetch.
- `video_autoplay_failed`: browser blocked or failed video playback.

The frontend avoids logging passwords, confirmation codes, Cognito tokens, and exact latitude/longitude.
