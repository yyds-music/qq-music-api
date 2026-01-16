"""
测试 QQ Music Cover API
搜索 "爱你没差刘瑞琦"，取第一个结果，获取封面URL
"""
import requests

API_BASE = "https://api.ygking.top"

# 1. 搜索歌曲
keyword = "爱你没差刘瑞琦"
search_url = f"{API_BASE}/api/search?keyword={keyword}&type=song&num=1"
print(f"搜索: {keyword}")
print(f"URL: {search_url}\n")

resp = requests.get(search_url)
data = resp.json()

if data.get("code") != 0 or not data.get("data", {}).get("list"):
    print("搜索失败:", data)
    exit(1)

# 取第一个结果
song = data["data"]["list"][0]
mid = song["mid"]
title = song["title"]
singer = song["singer"][0]["name"] if song.get("singer") else "未知"
album_mid = song.get("album", {}).get("mid", "")

print(f"歌曲: {title} - {singer}")
print(f"歌曲MID: {mid}")
print(f"专辑MID: {album_mid or '无'}")
print()

# 2. 获取封面
cover_url = f"{API_BASE}/api/song/cover?mid={mid}&size=500"
print(f"获取封面URL: {cover_url}")

resp = requests.get(cover_url)
data = resp.json()

if data.get("code") == 0:
    cover = data["data"]
    print(f"\n===== 封面信息 =====")
    print(f"封面URL: {cover['url']}")
    print(f"来源: {cover['source']}")
    print(f"尺寸: {cover['size']}")
    if cover.get("vs"):
        print(f"VS值: {cover['vs']}")
else:
    print("获取封面失败:", data)
