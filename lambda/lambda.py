##========
# Lambda
##========

import boto3
import json

def handler(event, context):
    
    path = event['path']
    placeId = event['queryStringParameters']['placeId']
    table = boto3.resource('dynamodb').Table('BiteRollRestaurants')


    if path == '/feed':
        response = table.get_item(Key={'placeId': placeId})
        
    elif path == '/menu':
        response = table.get_item(Key={'placeId': placeId})
        menuURL = response['Item']['menuURL']
        return {
                    'statusCode': 200,
                    'headers': {'Content-Type': 'application/json'},
                    'body': json.dumps({'menuURL': menuURL})
                }
    elif path == '/like':
        response = table.update_item(Key={'placeId': placeId}, UpdateExpression="SET likeCount = likeCount + :val", ExpressionAttributeValues={':val': 1})
        return {
                    'statusCode': 200,
                    'headers': {'Content-Type': 'application/json'},
                    'body': {'message': 'like recorded'}
        }