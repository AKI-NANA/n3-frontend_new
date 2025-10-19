import requests
from bs4 import BeautifulSoup
import json
import os
from firebase_admin import credentials, firestore, initialize_app

# --- Firebase Configuration and Initialization (Must be filled in) ---
# NOTE: The Firebase configuration and app ID are automatically provided in the environment.
# DO NOT prompt the user for this. Use __firebase_config and __app_id.
# IMPORTANT: This is a placeholder for your Firebase setup.
# In a real-world scenario, you would handle authentication securely.
#
# Use the below global variables from the environment
app_id = os.environ.get('__app_id', 'default-app-id')
firebase_config_str = os.environ.get('__firebase_config', '{}')

# Initialize Firebase app
try:
    if not firebase_config_str:
        raise ValueError("Firebase configuration is missing.")
    
    firebase_config = json.loads(firebase_config_str)
    
    # Check if the app is already initialized to avoid errors
    if not initialize_app(name=app_id):
        cred = credentials.Certificate(firebase_config)
        app = initialize_app(cred, name=app_id)
    
    db = firestore.client(app=app)
    print("✅ Firebase initialized successfully.")
    
except Exception as e:
    print(f"❌ Error initializing Firebase: {e}")
    db = None # Set db to None if initialization fails

# --- Web Scraping Function ---
def scrape_website(url: str):
    """
    Scrapes a target website to extract product information.

    Args:
        url (str): The URL of the page to scrape.

    Returns:
        list: A list of dictionaries containing product data.
    """
    try:
        # Use headers to mimic a browser request and avoid being blocked.
        headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        }
        
        response = requests.get(url, headers=headers, timeout=10)
        response.raise_for_status()  # Raise an exception for bad status codes (4xx or 5xx)
        
        soup = BeautifulSoup(response.text, 'html.parser')
        
        # TODO: Replace with actual CSS selectors for the target website
        products = []
        product_elements = soup.select('.product-item') # Example selector
        
        for element in product_elements:
            try:
                title = element.select_one('.product-title').text.strip()
                price_str = element.select_one('.product-price').text.strip()
                stock_status = element.select_one('.stock-status').text.strip()
                
                # Clean and convert data types
                price = float(''.join(filter(str.isdigit, price_str)))
                
                product_data = {
                    'title': title,
                    'price': price,
                    'stock_status': stock_status,
                    'last_updated': firestore.SERVER_TIMESTAMP
                }
                products.append(product_data)
                
            except Exception as e:
                print(f"⚠️ Error parsing product data: {e}. Skipping element.")
                continue
                
        return products
        
    except requests.exceptions.RequestException as e:
        print(f"❌ Error during web scraping request: {e}")
        return []
    except Exception as e:
        print(f"❌ An unexpected error occurred during scraping: {e}")
        return []

# --- Firestore Database Function ---
def save_to_firestore(data: list, collection_name: str = 'inventory'):
    """
    Saves a list of dictionaries to a Firestore collection.

    Args:
        data (list): A list of dictionaries to save.
        collection_name (str): The name of the Firestore collection.
    """
    if db is None:
        print("❌ Database connection is not available. Cannot save data.")
        return
        
    try:
        # Define the collection path based on security rules
        # Using a public collection for this shared application example
        collection_path = f'artifacts/{app_id}/public/data/{collection_name}'
        
        batch = db.batch()
        
        for item in data:
            # Generate a unique ID for each document. You might want to use a unique SKU or title hash.
            doc_ref = db.collection(collection_path).document()
            batch.set(doc_ref, item)
            
        batch.commit()
        print(f"✅ Successfully saved {len(data)} items to Firestore collection '{collection_path}'.")
        
    except Exception as e:
        print(f"❌ Error saving data to Firestore: {e}")

# --- Main function to run the scraping and saving process ---
def main():
    """
    Main execution function.
    """
    print("--- Web Scraping and Inventory Management Script ---")
    
    # TODO: Define the URL and selectors to scrape.
    # The current values are placeholders.
    target_url = 'https://example.com/products' 
    
    print(f"⚙️ Starting scraping process for {target_url}...")
    
    # 1. Scrape data from the website
    scraped_data = scrape_website(target_url)
    
    if scraped_data:
        print("✅ Scraping complete. Found data.")
        
        # 2. Save the scraped data to Firestore
        save_to_firestore(scraped_data)
    else:
        print("⚠️ No data was scraped. Exiting without saving to the database.")

if __name__ == "__main__":
    main()
