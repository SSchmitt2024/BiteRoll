##========
# Lambda
##========

import boto3
import json
import logging
import math
import urllib.request
from botocore.exceptions import ClientError
from decimal import Decimal

HEADERS = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*'
}

logger = logging.getLogger()
logger.setLevel(logging.INFO)


class DecimalEncoder(json.JSONEncoder):
    def default(self, o):
        if isinstance(o, Decimal):
            return int(o) if o % 1 == 0 else float(o)
        return super().default(o)


def log(level, event, **fields):
    payload = {'event': event, **fields}
    getattr(logger, level)(json.dumps(payload, cls=DecimalEncoder))


def api_response(status_code, body):
    return {
        'statusCode': status_code,
        'headers': HEADERS,
        'body': json.dumps(body, cls=DecimalEncoder)
    }


def require_params(params, required):
    missing = [name for name in required if not params.get(name)]
    if missing:
        raise ValueError(f"Missing required query parameter(s): {', '.join(missing)}")


def get_api_key():
    log('info', 'secret_fetch_started', secret='biteroll/google-maps-api-key')
    client = boto3.client('secretsmanager')
    secret = client.get_secret_value(SecretId='biteroll/google-maps-api-key')
    log('info', 'secret_fetch_succeeded', secret='biteroll/google-maps-api-key')
    return json.loads(secret['SecretString'])['GOOGLE_MAPS_API_KEY']


def get_nearby_places(lat, lng, api_key, radius=5000.0, request_id=None):
    url = "https://places.googleapis.com/v1/places:searchNearby"
    payload = json.dumps({
        "includedTypes": ["restaurant"],
        "maxResultCount": 20,
        "locationRestriction": {
            "circle": {
                "center": {"latitude": float(lat), "longitude": float(lng)},
                "radius": float(radius)
            }
        }
    })
    req = urllib.request.Request(url, data=payload.encode(), method='POST')
    req.add_header('Content-Type', 'application/json')
    req.add_header('X-Goog-Api-Key', api_key)
    req.add_header('X-Goog-FieldMask', 'places.id')

    log('info', 'google_places_request_started', requestId=request_id, radiusMeters=radius)
    with urllib.request.urlopen(req) as response:
        data = json.loads(response.read())

    place_ids = [place['id'] for place in data.get('places', [])]
    log('info', 'google_places_request_succeeded', requestId=request_id, placeCount=len(place_ids))
    return place_ids


def haversine(lat1, lng1, lat2, lng2):
    R = 6371000
    rlat1, rlat2 = math.radians(lat1), math.radians(lat2)
    dlat = math.radians(lat2 - lat1)
    dlng = math.radians(lng2 - lng1)
    a = math.sin(dlat / 2) ** 2 + math.cos(rlat1) * math.cos(rlat2) * math.sin(dlng / 2) ** 2
    return R * 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))


def handle_feed(params, table, request_id):
    require_params(params, ['lat', 'lng'])
    radius = float(params.get('radius', 5000))
    google_radius = max(1.0, min(radius, 50000.0))
    user_lat, user_lng = float(params['lat']), float(params['lng'])

    log('info', 'feed_request_started', requestId=request_id, radiusMeters=radius)
    api_key = get_api_key()
    place_ids = get_nearby_places(params['lat'], params['lng'], api_key, google_radius, request_id)

    results = []
    found_ids = set()
    dynamodb_hits = 0
    dynamodb_misses = 0

    def item_distance_meters(item):
        item_lat = item.get('lat')
        item_lng = item.get('lng')
        if item_lat is None or item_lng is None:
            return None
        return haversine(user_lat, user_lng, float(item_lat), float(item_lng))

    def restaurant_payload(place_id, item, distance_meters):
        return {
            'placeId': place_id,
            'name': item.get('name', ''),
            'description': item.get('description', ''),
            'tags': item.get('tags', []),
            'videos': item.get('videos', []),
            'likeCount': item.get('likeCount', 0),
            'distanceMeters': distance_meters,
            'orderURL': item.get('orderURL', '')
        }

    for place_id in place_ids:
        response = table.get_item(Key={'placeId': place_id})
        if 'Item' in response:
            item = response['Item']
            results.append(restaurant_payload(place_id, item, item_distance_meters(item)))
            found_ids.add(place_id)
            dynamodb_hits += 1
        else:
            dynamodb_misses += 1

    log(
        'info',
        'feed_nearby_lookup_completed',
        requestId=request_id,
        googlePlaceCount=len(place_ids),
        dynamodbHits=dynamodb_hits,
        dynamodbMisses=dynamodb_misses
    )

    log('info', 'feed_seed_scan_started', requestId=request_id)
    scan_response = table.scan()
    scanned_count = scan_response.get('ScannedCount', 0)
    seeded_matches = 0

    for item in scan_response.get('Items', []):
        pid = item['placeId']
        if pid in found_ids:
            continue
        item_lat = item.get('lat')
        item_lng = item.get('lng')
        if not item_lat or not item_lng:
            continue
        dist = haversine(user_lat, user_lng, float(item_lat), float(item_lng))
        if dist <= radius:
            results.append(restaurant_payload(pid, item, dist))
            seeded_matches += 1

    log(
        'info',
        'feed_request_succeeded',
        requestId=request_id,
        resultCount=len(results),
        seededMatches=seeded_matches,
        scannedCount=scanned_count
    )
    return api_response(200, {'restaurants': results})


def handle_menu(params, table, request_id):
    require_params(params, ['placeId'])
    place_id = params['placeId']

    log('info', 'menu_request_started', requestId=request_id, placeId=place_id)
    response = table.get_item(Key={'placeId': place_id})
    if 'Item' not in response:
        log('warning', 'menu_request_not_found', requestId=request_id, placeId=place_id)
        return api_response(404, {'error': 'Restaurant not found'})

    menu_url = response['Item'].get('menuURL')
    if not menu_url:
        log('warning', 'menu_request_missing_url', requestId=request_id, placeId=place_id)
        return api_response(404, {'error': 'Menu URL not found'})

    log('info', 'menu_request_succeeded', requestId=request_id, placeId=place_id)
    return api_response(200, {'menuURL': menu_url})


def handle_like(params, table, request_id):
    require_params(params, ['placeId'])
    place_id = params['placeId']
    action = params.get('action', 'like')

    log('info', 'like_request_started', requestId=request_id, placeId=place_id, action=action)
    if action == 'unlike':
        try:
            table.update_item(
                Key={'placeId': place_id},
                UpdateExpression='SET likeCount = likeCount - :val',
                ConditionExpression='attribute_exists(likeCount) AND likeCount > :zero',
                ExpressionAttributeValues={':val': 1, ':zero': 0}
            )
        except ClientError as e:
            if e.response['Error']['Code'] != 'ConditionalCheckFailedException':
                log('error', 'like_request_failed', requestId=request_id, placeId=place_id, action=action, error=e.response['Error']['Code'])
                raise
            log('warning', 'like_unlike_skipped_zero_count', requestId=request_id, placeId=place_id)

        log('info', 'like_request_succeeded', requestId=request_id, placeId=place_id, action=action)
        return api_response(200, {'message': 'unlike recorded'})

    table.update_item(
        Key={'placeId': place_id},
        UpdateExpression='SET likeCount = if_not_exists(likeCount, :zero) + :val',
        ExpressionAttributeValues={':val': 1, ':zero': 0}
    )
    log('info', 'like_request_succeeded', requestId=request_id, placeId=place_id, action='like')
    return api_response(200, {'message': 'like recorded'})


def handler(event, context):
    request_id = getattr(context, 'aws_request_id', 'local')
    path = event.get('path', '')
    params = event.get('queryStringParameters') or {}

    log('info', 'request_started', requestId=request_id, path=path)
    table = boto3.resource('dynamodb').Table('BiteRollRestaurants')

    try:
        if path == '/feed':
            response = handle_feed(params, table, request_id)
        elif path == '/menu':
            response = handle_menu(params, table, request_id)
        elif path == '/like':
            response = handle_like(params, table, request_id)
        else:
            log('warning', 'request_unknown_path', requestId=request_id, path=path)
            response = api_response(404, {'error': 'Unknown path'})

        log('info', 'request_completed', requestId=request_id, path=path, statusCode=response['statusCode'])
        return response
    except ValueError as e:
        log('warning', 'request_validation_failed', requestId=request_id, path=path, error=str(e))
        return api_response(400, {'error': str(e)})
    except Exception as e:
        log('error', 'request_failed', requestId=request_id, path=path, error=type(e).__name__)
        return api_response(500, {'error': 'Internal server error'})
