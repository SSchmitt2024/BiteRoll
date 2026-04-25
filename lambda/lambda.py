##========
# Lambda
##========

import boto3
import json
import math
import urllib.request
from botocore.exceptions import ClientError
from decimal import Decimal

HEADERS = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*'
}

class DecimalEncoder(json.JSONEncoder):
    def default(self, o):
        if isinstance(o, Decimal):
            return int(o) if o % 1 == 0 else float(o)
        return super().default(o)
    
def get_api_key():
    client = boto3.client('secretsmanager', region_name='us-east-2')
    secret = client.get_secret_value(SecretId='biteroll/google-maps-api-key')
    return json.loads(secret['SecretString'])['GOOGLE_MAPS_API_KEY']

def get_nearby_places(lat, lng, api_key, radius=5000.0):
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
    
    with urllib.request.urlopen(req) as response:
        data = json.loads(response.read())
    
    print(f"[MAPS] Raw response: {json.dumps(data)[:500]}")
    place_ids = [place['id'] for place in data.get('places', [])]
    print(f"[MAPS] Found {len(place_ids)} nearby restaurants for lat={lat}, lng={lng}")
    return place_ids
def haversine(lat1, lng1, lat2, lng2):
    R = 6371000
    rlat1, rlat2 = math.radians(lat1), math.radians(lat2)
    dlat = math.radians(lat2 - lat1)
    dlng = math.radians(lng2 - lng1)
    a = math.sin(dlat/2)**2 + math.cos(rlat1)*math.cos(rlat2)*math.sin(dlng/2)**2
    return R * 2 * math.atan2(math.sqrt(a), math.sqrt(1-a))

def handler(event, context):
    path = event['path']
    params = event.get('queryStringParameters', {})
    print(f"[REQUEST] path={path} params={params}")
    table = boto3.resource('dynamodb', region_name='us-east-2').Table('BiteRollRestaurants')

    if path == '/feed':
        lat = params['lat']
        lng = params['lng']
        radius = float(params.get('radius', 5000))
        radius = max(1.0, min(radius, 50000.0))
        api_key = get_api_key()
        place_ids = get_nearby_places(lat, lng, api_key, radius)
        
        results = []
        found_ids = set()
        for place_id in place_ids:
            response = table.get_item(Key={'placeId': place_id})
            if 'Item' in response:
                item = response['Item']
                results.append({
                    'placeId': place_id,
                    'name': item.get('name', ''),
                    'videos': item.get('videos', []),
                    'likeCount': item.get('likeCount', 0)
                })
                found_ids.add(place_id)
            else:
                print(f"[FEED] No DynamoDB record for placeId={place_id}")

        scan_response = table.scan()
        user_lat, user_lng = float(lat), float(lng)
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
                results.append({
                    'placeId': pid,
                    'name': item.get('name', ''),
                    'videos': item.get('videos', []),
                    'likeCount': item.get('likeCount', 0)
                })
                print(f"[FEED] Added seeded restaurant {pid} at {dist:.0f}m")

        print(f"[FEED] Returning {len(results)} restaurants")
        return {
            'statusCode': 200,
            'headers': HEADERS,
            'body': json.dumps({'restaurants': results}, cls=DecimalEncoder)
        }

    elif path == '/menu':
        placeId = params['placeId']
        print(f"[MENU] Fetching menu for placeId={placeId}")
        response = table.get_item(Key={'placeId': placeId})
        if 'Item' not in response:
            print(f"[MENU] ERROR - no record found for placeId={placeId}")
            return {
                'statusCode': 404,
                'headers': HEADERS,
                'body': json.dumps({'error': 'Restaurant not found'})
            }
        menuURL = response['Item']['menuURL']
        print(f"[MENU] Returning menuURL for placeId={placeId}")
        return {
            'statusCode': 200,
            'headers': HEADERS,
            'body': json.dumps({'menuURL': menuURL})
        }

    elif path == '/like':
        placeId = params['placeId']
        action = params.get('action', 'like')
        if action == 'unlike':
            print(f"[LIKE] Decrementing like for placeId={placeId}")
            try:
                table.update_item(
                    Key={'placeId': placeId},
                    UpdateExpression='SET likeCount = likeCount - :val',
                    ConditionExpression='attribute_exists(likeCount) AND likeCount > :zero',
                    ExpressionAttributeValues={':val': 1, ':zero': 0}
                )
            except ClientError as e:
                if e.response['Error']['Code'] != 'ConditionalCheckFailedException':
                    raise
                print(f"[LIKE] Unlike skipped (likeCount already 0) for placeId={placeId}")
            print(f"[LIKE] Unlike success for placeId={placeId}")
            return {
                'statusCode': 200,
                'headers': HEADERS,
                'body': json.dumps({'message': 'unlike recorded'})
            }
        print(f"[LIKE] Incrementing like for placeId={placeId}")
        table.update_item(
            Key={'placeId': placeId},
            UpdateExpression='SET likeCount = if_not_exists(likeCount, :zero) + :val',
            ExpressionAttributeValues={':val': 1, ':zero': 0}
        )
        print(f"[LIKE] Success for placeId={placeId}")
        return {
            'statusCode': 200,
            'headers': HEADERS,
            'body': json.dumps({'message': 'like recorded'})
        }
    
    else:
        print(f"[ERROR] Unknown path={path}")
        return {
            'statusCode': 404,
            'headers': HEADERS,
            'body': json.dumps({'error': 'Unknown path'})
        }