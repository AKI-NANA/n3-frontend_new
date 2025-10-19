import requests
from bs4 import BeautifulSoup
import json
import os
from firebase_admin import credentials, firestore, initialize_app
from datetime import datetime

# --- Firebase Configuration and Initialization ---
# The Firebase configuration and app ID are automatically provided in the environment.
app_id = os.environ.get('__app_id', 'default-app-id')
firebase_config_str = os.environ.get('__firebase_config', '{}')

# Initialize Firebase app
try:
    if not firebase_config_str:
        raise ValueError("Firebase configuration is missing.")
    
    firebase_config = json.loads(firebase_config_str)
    
    # Use a try-except block to handle re-initialization gracefully
    try:
        app = initialize_app(credentials.Certificate(firebase_config), name=app_id)
    except ValueError:
        app = initialize_app(name=app_id)
    
    db = firestore.client(app=app)
    print("✅ Firebase initialized successfully.")
    
except Exception as e:
    print(f"❌ Error initializing Firebase: {e}")
    db = None

# --- Web Scraping Function ---
def scrape_yahoo_auction(query: str):
    """
    Scrapes Yahoo! Auctions search results to extract product information.
    
    Args:
        query (str): The search keyword to query.
    
    Returns:
        list: A list of dictionaries containing scraped product data.
    """
    try:
        # TODO: This URL and selectors are examples.
        # You will need to inspect the actual Yahoo! Auctions page structure
        # and update them to match.
        url = f"https://auctions.yahoo.co.jp/search/search?p={query}"
        
        headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        }
        
        response = requests.get(url, headers=headers, timeout=10)
        response.raise_for_status()
        
        soup = BeautifulSoup(response.text, 'html.parser')
        
        products = []
        product_elements = soup.select('.ProductGrid__item') # Example selector
        
        for element in product_elements:
            try:
                title_elem = element.select_one('.Product__titleLink')
                price_elem = element.select_one('.Product__priceValue')
                
                title = title_elem.text.strip() if title_elem else "N/A"
                price = float(''.join(filter(str.isdigit, price_elem.text))) if price_elem else 0.0
                
                # Create a unique ID for the product
                item_id = title_elem['href'].split('/')[-1] if title_elem and 'href' in title_elem.attrs else None
                
                if item_id:
                    product_data = {
                        "sku": item_id,
                        "product_name": title,
                        "price": price,
                        "stock_status": "active", # Assuming items are in stock on a search page
                        "mall_name": "ヤフオク!",
                        "last_updated": datetime.utcnow().isoformat() + "Z"
                    }
                    products.append(product_data)
                    
            except Exception as e:
                print(f"⚠️ Error parsing product data: {e}. Skipping element.")
                continue
                
        return products
        
    except requests.exceptions.RequestException as e:
        print(f"❌ Web scraping request failed: {e}")
        return []

# --- Firestore Saving Function ---
def save_inventory_data(data: list, collection_name: str = 'inventory_data_yahoo_auction'):
    """
    Saves a list of dictionaries to a Firestore collection.
    
    Args:
        data (list): A list of product dictionaries.
        collection_name (str): The name of the Firestore collection.
    """
    if db is None:
        print("❌ Firestore database is not available. Cannot save data.")
        return
    
    try:
        # Define the collection path based on security rules for public data
        collection_path = f'artifacts/{app_id}/public/data/{collection_name}'
        
        for item in data:
            # Use the SKU as the document ID for easy updates
            doc_ref = db.collection(collection_path).document(item['sku'])
            doc_ref.set(item, merge=True)
            
        print(f"✅ Successfully saved {len(data)} items to Firestore.")
    except Exception as e:
        print(f"❌ Error saving data to Firestore: {e}")

# --- Main Execution ---
if __name__ == "__main__":
    search_query = "多機能スマートウォッチ"
    print(f"--- Starting to scrape Yahoo! Auctions for: {search_query} ---")
    
    scraped_data = scrape_yahoo_auction(search_query)
    
    if scraped_data:
        save_inventory_data(scraped_data)
    else:
        print("⚠️ No data was scraped. Nothing to save.")
