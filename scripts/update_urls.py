import boto3

CF = "https://d2qr32hgpdefgg.cloudfront.net"
TABLE = "BiteRollRestaurants"

restaurants = [
    {
        "placeId": "ChIJ9bceiPF544kRzQuACrgS4pA",
        "name": "Gyu Kaku",
        "description": "Premium Japanese BBQ experience with interactive table-top grilling and authentic flavors",
        "tags": ["Japanese", "BBQ", "Fine Dining"],
        "videos": [f"{CF}/media/mock_restaurants/GyuKaku/GyuKaku{i}.mp4" for i in range(1, 4)],
        "menuURL": f"{CF}/media/menus/gyu_kaku.json",
        "viewCount": 8432,
        "likeCount": 1247,
        "lat": "42.3489",
        "lng": "-71.0803"
    },
    {
        "placeId": "ChIJH8h9xZaT4okReIiQ_SEmyqg",
        "name": "Durham House of Pizza",
        "description": "Classic New England pizza joint serving wood-fired pies and crispy wings since 1985",
        "tags": ["Pizza", "Casual", "American"],
        "videos": [f"{CF}/media/mock_restaurants/DHOP/DHOP{i}.mp4" for i in range(1, 4)],
        "menuURL": f"{CF}/media/menus/durham_house_of_pizza.json",
        "viewCount": 5821,
        "likeCount": 892,
        "lat": "43.1339",
        "lng": "-70.9264"
    },
    {
        "placeId": "ChIJt47g35aT4okR1wL6K-yxeo8",
        "name": "Bagel Works Cafe",
        "description": "Fresh-baked bagels and sandwiches with locally roasted coffee and quick bites",
        "tags": ["Bagels", "Breakfast", "Quick Lunch"],
        "videos": [f"{CF}/media/mock_restaurants/BagelWorks/BagelWorks{i}.mp4" for i in range(1, 4)],
        "menuURL": f"{CF}/media/menus/works_cafe.json",
        "viewCount": 4156,
        "likeCount": 634,
        "lat": "43.1341",
        "lng": "-70.9259"
    },
    {
        "placeId": "ChIJyfSwagy_4okRNUzT5b2D1Jc",
        "name": "Moe's Italian Sandwiches",
        "description": "Authentic Italian subs loaded with premium meats, cheeses, and house-made dressings",
        "tags": ["Italian", "Sandwiches", "Casual"],
        "videos": [f"{CF}/media/mock_restaurants/Moes/Moes{i}.mp4" for i in range(1, 3)],
        "menuURL": f"{CF}/media/menus/moes_italian_sandwiches.json",
        "viewCount": 6234,
        "likeCount": 1034,
        "lat": "43.0718",
        "lng": "-70.7636"
    },
    {
        "placeId": "ChIJ-yVthhSX4okRzu-SWQZHN5A",
        "name": "Hong Asian Noodle Bar",
        "description": "Contemporary Asian cuisine featuring hand-pulled noodles, dumplings, and wok-tossed specialties",
        "tags": ["Asian", "Noodles", "Dumplings"],
        "videos": [f"{CF}/media/mock_restaurants/HongNoodle/Hong{i}.mp4" for i in range(1, 4)],
        "menuURL": f"{CF}/media/menus/hong_asian_noodle_bar.json",
        "viewCount": 7623,
        "likeCount": 1521,
        "lat": "43.1979",
        "lng": "-70.8737"
    },
    {
        "placeId": "ChIJ27jsyQu_4okRouMH9R20cF4",
        "name": "BRGR Bar",
        "description": "Gourmet burgers with craft beer selection and loaded fries in a casual gastropub setting",
        "tags": ["Burgers", "Beer", "Gastropub"],
        "videos": [f"{CF}/media/mock_restaurants/BRGRBar/BRGRBar{i}.mp4" for i in range(1, 4)],
        "menuURL": f"{CF}/media/menus/brgr_bar.json",
        "viewCount": 9145,
        "likeCount": 1876,
        "lat": "43.0781",
        "lng": "-70.7575"
    },
    {
        "placeId": "ChIJ8yJP74ST4okREf4Wl8JgR4w",
        "name": "Mei Wei",
        "description": "Szechuan and Cantonese cuisine with authentic recipes and house-made sauces",
        "tags": ["Chinese", "Szechuan", "Asian Fusion"],
        "videos": [f"{CF}/media/mock_restaurants/MeiWei/MeiWei{i}.mp4" for i in range(1, 4)],
        "menuURL": f"{CF}/media/menus/mei_wei.json",
        "viewCount": 5987,
        "likeCount": 1143,
        "lat": "43.1345",
        "lng": "-70.9285"
    },
]

dynamodb = boto3.resource("dynamodb", region_name="us-east-2")
table = dynamodb.Table(TABLE)

for r in restaurants:
    table.update_item(
        Key={"placeId": r["placeId"]},
        UpdateExpression="SET videos = :v, menuURL = :m, lat = :lat, lng = :lng, #n = :n, description = :d, tags = :t, viewCount = :vc, likeCount = :lc",
        ConditionExpression="attribute_exists(placeId)",
        ExpressionAttributeNames={"#n": "name"},
        ExpressionAttributeValues={
            ":v": r["videos"],
            ":m": r["menuURL"],
            ":lat": r["lat"],
            ":lng": r["lng"],
            ":n": r["name"],
            ":d": r["description"],
            ":t": r["tags"],
            ":vc": r["viewCount"],
            ":lc": r["likeCount"]
        }
    )
    print(f"Updated {r['placeId']}")

print("Done!")
