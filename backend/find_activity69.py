import requests
import json

# 获取活动列表
url = "http://localhost:3460/api/activities"
headers = {
    "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjBhYjY0MWNjLTZkMGItMTFmMC1iMTRkLTYwY2Y4NGNjMGNiOCIsInVzZXJuYW1lIjoiYWRtaW4iLCJyb2xlIjoic3VwZXJfYWRtaW4iLCJwZXJtaXNzaW9ucyI6WyJkYXNoYm9hcmQ6cmVhZCIsImRhc2hib2FyZDp3cml0ZSIsInVzZXI6cmVhZCIsInVzZXI6Y3JlYXRlIiwidXNlcjp1cGRhdGUiLCJ1c2VyOmRlbGV0ZSIsInRlYW06cmVhZCIsInRlYW06Y3JlYXRlIiwidGVhbTp1cGRhdGUiLCJ0ZWFtOmRlbGV0ZSIsImFjdGl2aXR5OnJlYWQiLCJhY3Rpdml0eTpjcmVhdGUiLCJhY3Rpdml0eTp1cGRhdGUiLCJhY3Rpdml0eTpkZWxldGUiLCJjb250ZW50OnJlYWQiLCJjb250ZW50OmNyZWF0ZSIsImNvbnRlbnQ6dXBkYXRlIiwiY29udGVudDpkZWxldGUiLCJzeXN0ZW06cmVhZCIsInN5c3RlbTp1cGRhdGUiLCJzeXN0ZW06ZGVsZXRlIl0sImlhdCI6MTc1ODAxNDUzMywiZXhwIjoxNzU4MTAwOTMzfQ.8h-sW60OWYJH2J6DNetmQmAyx0qyUIRhl46RepLPl3c"
}

response = requests.get(url, headers=headers)
data = response.json()

print("查找序号为69的活动...")
for activity in data['data']['activities']:
    if activity.get('sequence_number') == 69:
        print(f"\n找到序号69的活动:")
        print(f"UUID: {activity['id']}")
        print(f"标题: {activity['title']}")
        print(f"描述: {activity['description']}")
        print(f"当前参与者数: {activity['current_participants']}")
        print(f"最大参与者数: {activity['max_participants']}")
        print(f"状态: {activity['status']}")
        break
else:
    print("\n未找到序号为69的活动")
    print("\n所有活动的序号:")
    for activity in data['data']['activities']:
        print(f"序号 {activity.get('sequence_number', 'N/A')}: {activity['title']}")