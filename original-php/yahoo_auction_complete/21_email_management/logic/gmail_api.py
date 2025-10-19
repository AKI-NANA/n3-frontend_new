import os.path
from google.auth.transport.requests import Request
from google.oauth2.credentials import Credentials
from google_auth_oauthlib.flow import InstalledAppFlow
from googleapiclient.discovery import build

# If modifying these scopes, delete the file token.json.
SCOPES = ['https://www.googleapis.com/auth/gmail.modify']

def get_gmail_service():
    creds = None
    if os.path.exists('token.json'):
        creds = Credentials.from_authorized_user_file('token.json', SCOPES)
    if not creds or not creds.valid:
        if creds and creds.expired and creds.refresh_token:
            creds.refresh(Request())
        else:
            flow = InstalledAppFlow.from_client_secrets_file(
                'credentials.json', SCOPES)
            creds = flow.run_local_server(port=0)
        with open('token.json', 'w') as token:
            token.write(creds.to_json())
    try:
        service = build('gmail', 'v1', credentials=creds)
        return service
    except Exception as error:
        print(f'An error occurred: {error}')
        return None

def list_emails(service, query='is:unread'):
    try:
        results = service.users().messages().list(userId='me', q=query).execute()
        messages = results.get('messages', [])
        
        email_details = []
        for message in messages:
            msg = service.users().messages().get(userId='me', id=message['id']).execute()
            headers = msg['payload']['headers']
            subject = [h['value'] for h in headers if h['name'] == 'Subject'][0]
            sender = [h['value'] for h in headers if h['name'] == 'From'][0]
            email_details.append({'id': msg['id'], 'subject': subject, 'from': sender})
            
        return email_details
    except Exception as error:
        print(f'An error occurred: {error}')
        return []

def delete_emails(service, message_ids):
    try:
        service.users().messages().batchDelete(userId='me', body={'ids': message_ids}).execute()
        return True
    except Exception as error:
        print(f'An error occurred: {error}')
        return False