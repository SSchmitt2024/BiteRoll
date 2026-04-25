import boto3

CF = "https://d2qr32hgpdefgg.cloudfront.net"
TABLE = "BiteRollRestaurants"

restaurants = [
    {
        "placeId": "ChIJ9bceiPF544kRzQuACrgS4pA",
        "videos": [f"{CF}/media/mock_restaurants/GyuKaku/GyuKaku{i}.mp4" for i in range(1, 4)],
        "menuURL": f"{CF}/media/menus/gyu_kaku.json",
        "lat": "42.3489",
        "lng": "-71.0803"
    },
    {
        "placeId": "ChIJH8h9xZaT4okReIiQ_SEmyqg",
        "videos": [f"{CF}/media/mock_restaurants/DHOP/DHOP{i}.mp4" for i in range(1, 4)],
        "menuURL": f"{CF}/media/menus/durham_house_of_pizza.json",
        "lat": "43.1339",
        "lng": "-70.9264"
    },
    {
        "placeId": "ChIJt47g35aT4okR1wL6K-yxeo8",
        "videos": [f"{CF}/media/mock_restaurants/BagelWorks/BagelWorks{i}.mp4" for i in range(1, 4)],
        "menuURL": f"{CF}/media/menus/works_cafe.json",
        "lat": "43.1341",
        "lng": "-70.9259"
    },
    {
        "placeId": "ChIJyfSwagy_4okRNUzT5b2D1Jc",
        "videos": [f"{CF}/media/mock_restaurants/Moes/Moes{i}.mp4" for i in range(1, 3)],
        "menuURL": f"{CF}/media/menus/moes_italian_sandwiches.json",
        "lat": "43.0718",
        "lng": "-70.7636"
    },
    {
        "placeId": "ChIJ-yVthhSX4okRzu-SWQZHN5A",
        "videos": [f"{CF}/media/mock_restaurants/HongNoodle/Hong{i}.mp4" for i in range(1, 4)],
        "menuURL": f"{CF}/media/menus/hong_asian_noodle_bar.json",
        "lat": "43.1979",
        "lng": "-70.8737"
    },
    {
        "placeId": "ChIJ27jsyQu_4okRouMH9R20cF4",
        "videos": [f"{CF}/media/mock_restaurants/BRGRBar/BRGRBar{i}.mp4" for i in range(1, 4)],
        "menuURL": f"{CF}/media/menus/brgr_bar.json",
        "lat": "43.0781",
        "lng": "-70.7575"
    },
    {
        "placeId": "ChIJ8yJP74ST4okREf4Wl8JgR4w",
        "videos": [f"{CF}/media/mock_restaurants/MeiWei/MeiWei{i}.mp4" for i in range(1, 4)],
        "menuURL": f"{CF}/media/menus/mei_wei.json",
        "lat": "43.1345",
        "lng": "-70.9285"
    },
]

dynamodb = boto3.resource("dynamodb", region_name="us-east-2")
table = dynamodb.Table(TABLE)

for r in restaurants:
    table.update_item(
        Key={"placeId": r["placeId"]},
        UpdateExpression="SET videos = :v, menuURL = :m, lat = :lat, lng = :lng",
        ExpressionAttributeValues={
            ":v": r["videos"],
            ":m": r["menuURL"],
            ":lat": r["lat"],
            ":lng": r["lng"]
        }
    )
    print(f"Updated {r['placeId']}")

print("Done!")