##========
# Lambda
##========

import boto3
import json
import urllib.request

HEADERS = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*'
}

def get_api_key():
    client = boto3.client('secretsmanager', region_name='us-east-2')
    secret = client.get_secret_value(SecretId='biteroll/google-maps-api-key')
    return json.loads(secret['SecretString'])['GOOGLE_MAPS_API_KEY']

def get_nearby_places(lat, lng, api_key):
    url = f"https://maps.googleapis.com/maps/api/place/nearbysearch/json?location={lat},{lng}&radius=5000&type=restaurant&opennow=true&key={api_key}"
    with urllib.request.urlopen(url) as response:
        data = json.loads(response.read())
    place_ids = [place['place_id'] for place in data.get('results', [])]
    print(f"[MAPS] Found {len(place_ids)} nearby restaurants for lat={lat}, lng={lng}")
    return place_ids

def handler(event, context):
    path = event['path']
    params = event.get('queryStringParameters', {})
    print(f"[REQUEST] path={path} params={params}")
    table = boto3.resource('dynamodb', region_name='us-east-2').Table('BiteRollRestaurants')

    if path == '/feed':
        lat = params['lat']
        lng = params['lng']
        api_key = get_api_key()
        place_ids = get_nearby_places(lat, lng, api_key)
        
        results = []
        for place_id in place_ids:
            response = table.get_item(Key={'placeId': place_id})
            if 'Item' in response:
                item = response['Item']
                results.append({
                    'placeId': place_id,
                    'videos': item.get('videos', []),
                    'likeCount': item.get('likeCount', 0)
                })
            else:
                print(f"[FEED] No DynamoDB record for placeId={place_id}")
        
        print(f"[FEED] Returning {len(results)} restaurants")
        return {
            'statusCode': 200,
            'headers': HEADERS,
            'body': json.dumps({'restaurants': results})
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
        print(f"[LIKE] Incrementing like for placeId={placeId}")
        table.update_item(
            Key={'placeId': placeId},
            UpdateExpression='SET likeCount = likeCount + :val',
            ExpressionAttributeValues={':val': 1}
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