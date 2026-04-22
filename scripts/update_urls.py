import boto3

CF = "https://d2qr32hgpdefgg.cloudfront.net"
TABLE = "BiteRollRestaurants"

restaurants = [
    {
        "placeId": "ChIJ9bceiPF544kRzQuACrgS4pA",
        "videos": [f"{CF}/media/mock_restaurants/GyuKaku/GyuKaku{i}.mp4" for i in range(1, 4)],
        "menuURL": f"{CF}/media/menus/gyu_kaku.json"
    },
    {
        "placeId": "ChIJH8h9xZaT4okReIiQ_SEmyqg",
        "videos": [f"{CF}/media/mock_restaurants/DHOP/DHOP{i}.mp4" for i in range(1, 4)],
        "menuURL": f"{CF}/media/menus/durham_house_of_pizza.json"
    },
    {
        "placeId": "ChIJt47g35aT4okR1wL6K-yxeo8",
        "videos": [f"{CF}/media/mock_restaurants/BagelWorks/BagelWorks{i}.mp4" for i in range(1, 4)],
        "menuURL": f"{CF}/media/menus/works_cafe.json"
    },
    {
        "placeId": "ChIJyfSwagy_4okRNUzT5b2D1Jc",
        "videos": [f"{CF}/media/mock_restaurants/Moes/Moes{i}.mp4" for i in range(1, 3)],
        "menuURL": f"{CF}/media/menus/moes_italian_sandwiches.json"
    },
    {
        "placeId": "ChIJ-yVthhSX4okRzu-SWQZHN5A",
        "videos": [f"{CF}/media/mock_restaurants/HongNoodle/Hong{i}.mp4" for i in range(1, 4)],
        "menuURL": f"{CF}/media/menus/hong_asian_noodle_bar.json"
    },
    {
        "placeId": "ChIJ27jsyQu_4okRouMH9R20cF4",
        "videos": [f"{CF}/media/mock_restaurants/BRGRBar/BRGRBar{i}.mp4" for i in range(1, 4)],
        "menuURL": f"{CF}/media/menus/brgr_bar.json"
    },
    {
        "placeId": "ChIJ8yJP74ST4okREf4Wl8JgR4w",
        "videos": [f"{CF}/media/mock_restaurants/MeiWei/MeiWei{i}.mp4" for i in range(1, 4)],
        "menuURL": f"{CF}/media/menus/mei_wei.json"
    },
]

dynamodb = boto3.resource("dynamodb", region_name="us-east-2")
table = dynamodb.Table(TABLE)

for r in restaurants:
    table.update_item(
        Key={"placeId": r["placeId"]},
        UpdateExpression="SET videos = :v, menuURL = :m",
        ExpressionAttributeValues={
            ":v": r["videos"],
            ":m": r["menuURL"]
        }
    )
    print(f"Updated {r['placeId']}")

print("Done!")