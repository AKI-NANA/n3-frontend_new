import requests
import json
import os

# 環境変数からAPI情報を取得（セキュリティのため）
EBAY_API_BASE_URL = "https://api.ebay.com/sell/account/v1"
AUTH_TOKEN = os.getenv("EBAY_OAUTH_TOKEN") # 環境変数に設定してください

headers = {
    "Authorization": f"Bearer {AUTH_TOKEN}",
    "Content-Type": "application/json",
    "Accept": "application/json"
}

def create_shipping_policy(policy_name: str, policy_data: dict) -> str:
    """eBay APIを通じて新しい配送ポリシーを作成する"""
    url = f"{EBAY_API_BASE_URL}/shipping_policy"
    
    try:
        response = requests.post(url, headers=headers, data=json.dumps(policy_data))
        response.raise_for_status()
        result = response.json()
        policy_id = result.get('fulfillmentPolicyId')
        print(f"✅ ポリシー '{policy_name}' の作成に成功しました。ID: {policy_id}")
        return policy_id
    except requests.exceptions.HTTPError as err:
        print(f"❌ HTTPエラーが発生しました: {err.response.status_code}")
        print(f"詳細: {err.response.text}")
        return None

def automated_policy_creation(usa_base_cost: float):
    """3つの配送ポリシーを自動で作成するメイン関数"""
    print("🚀 配送ポリシーの自動作成を開始します...")
    
    # 1. USA向け送料無料ポリシー
    usa_policy_data = {
        "name": "USA向け送料無料ポリシー",
        "marketplaceId": "EBAY_US",
        "shippingOptions": [
            {
                "shippingServiceCode": "JP_ePacket",
                "shippingServiceType": "EXPEDITED",
                "costType": "FLAT_RATE",
                "shippingCost": { "value": "0.00", "currency": "USD" }
            }
        ]
    }
    usa_policy_id = create_shipping_policy(usa_policy_data["name"], usa_policy_data)

    # 2. その他地域向けポリシー (USAより安い国は送料無料)
    other_policy_data = {
        "name": "USA以外向け送料追加ポリシー",
        "marketplaceId": "EBAY_US",
        "shippingOptions": [
            # ここはCSVから動的に生成されます。ここでは例として固定値を設定します。
            {
                "shippingServiceCode": "JP_ePacket",
                "shippingServiceType": "EXPEDITED",
                "costType": "FLAT_RATE",
                "shippingCost": { "value": f"{max(0, 30.0 - usa_base_cost):.2f}", "currency": "USD" },
                "shippingServiceId": "Europe" # 例
            },
            {
                "shippingServiceCode": "JP_ePacket",
                "shippingServiceType": "EXPEDITED",
                "costType": "FLAT_RATE",
                "shippingCost": { "value": "0.00", "currency": "USD" }, # USAより安い地域は送料無料
                "shippingServiceId": "Asia" # 例
            }
        ]
    }
    other_policy_id = create_shipping_policy(other_policy_data["name"], other_policy_data)

    # 3. 日本国内向けポリシー
    domestic_policy_data = {
        "name": "日本国内向けポリシー",
        "marketplaceId": "EBAY_JP",
        "shippingOptions": [
            {
                "shippingServiceCode": "JP_Yu-Pack",
                "shippingServiceType": "EXPEDITED",
                "costType": "FLAT_RATE",
                "shippingCost": { "value": "1000.00", "currency": "JPY" }
            }
        ]
    }
    domestic_policy_id = create_shipping_policy(domestic_policy_data["name"], domestic_policy_data)

    return {
        "usa_policy_id": usa_policy_id,
        "other_policy_id": other_policy_id,
        "domestic_policy_id": domestic_policy_id
    }

if __name__ == '__main__':
    # 例としてUSAの基準送料を$20と仮定
    # automated_policy_creation(usa_base_cost=20.00)
    pass