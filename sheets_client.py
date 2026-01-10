"""
Google Sheets API integration module
Handles reading URLs from and writing scraped data to Google Sheets
"""
import os.path
from google.auth.transport.requests import Request
from google.oauth2.credentials import Credentials
from google_auth_oauthlib.flow import InstalledAppFlow
from googleapiclient.discovery import build
from googleapiclient.errors import HttpError

# If modifying these scopes, delete the file token.json.
SCOPES = ['https://www.googleapis.com/auth/spreadsheets']


class GoogleSheetsClient:
    """Client for interacting with Google Sheets API"""
    
    def __init__(self, spreadsheet_id):
        """
        Initialize Google Sheets client
        
        Args:
            spreadsheet_id: The ID of the Google Sheets spreadsheet
        """
        self.spreadsheet_id = spreadsheet_id
        self.service = self._authenticate()
    
    def _authenticate(self):
        """Authenticate with Google Sheets API"""
        creds = None
        
        # The file token.json stores the user's access and refresh tokens
        if os.path.exists('token.json'):
            creds = Credentials.from_authorized_user_file('token.json', SCOPES)
        
        # If there are no (valid) credentials available, let the user log in.
        if not creds or not creds.valid:
            if creds and creds.expired and creds.refresh_token:
                creds.refresh(Request())
            else:
                if not os.path.exists('credentials.json'):
                    raise FileNotFoundError(
                        "credentials.json not found. Please download it from Google Cloud Console."
                    )
                flow = InstalledAppFlow.from_client_secrets_file(
                    'credentials.json', SCOPES)
                creds = flow.run_local_server(port=0)
            
            # Save the credentials for the next run
            with open('token.json', 'w') as token:
                token.write(creds.to_json())
        
        return build('sheets', 'v4', credentials=creds)
    
    def read_urls_from_column(self, sheet_name='Compras', column='H', start_row=3):
        """
        Read URLs from a specific column in the sheet
        
        Args:
            sheet_name: Name of the sheet (default: 'Compras')
            column: Column letter (default: 'H')
            start_row: Starting row number (default: 3)
        
        Returns:
            List of tuples: (row_number, url)
        """
        try:
            # Read from the column starting at start_row
            range_name = f"{sheet_name}!{column}{start_row}:{column}"
            
            result = self.service.spreadsheets().values().get(
                spreadsheetId=self.spreadsheet_id,
                range=range_name
            ).execute()
            
            values = result.get('values', [])
            
            if not values:
                print('No data found.')
                return []
            
            # Return list of (row_number, url) tuples for non-empty cells
            urls = []
            for i, row in enumerate(values):
                if row and row[0].strip():  # Check if cell is not empty
                    urls.append((start_row + i, row[0].strip()))
            
            return urls
        
        except HttpError as err:
            print(f"An error occurred: {err}")
            return []
    
    def write_product_data(self, sheet_name='Compras', row_number=3, data=None):
        """
        Write scraped product data to the sheet
        
        Args:
            sheet_name: Name of the sheet (default: 'Compras')
            row_number: Row number to write to
            data: Dictionary with keys: name, price, description, image, link
        """
        if data is None:
            return
        
        try:
            # Assuming columns: A=Name, B=Price, C=Description, D=Image, E=Link
            # Adjust these columns as needed
            values = [
                [
                    data.get('name', ''),
                    data.get('price', ''),
                    data.get('description', ''),
                    data.get('image', ''),
                    data.get('link', '')
                ]
            ]
            
            range_name = f"{sheet_name}!A{row_number}:E{row_number}"
            
            body = {
                'values': values
            }
            
            result = self.service.spreadsheets().values().update(
                spreadsheetId=self.spreadsheet_id,
                range=range_name,
                valueInputOption='RAW',
                body=body
            ).execute()
            
            print(f"Updated row {row_number}: {result.get('updatedCells')} cells updated.")
            
        except HttpError as err:
            print(f"An error occurred: {err}")
    
    def batch_write_products(self, sheet_name='Compras', products=None):
        """
        Batch write multiple products to the sheet
        
        Args:
            sheet_name: Name of the sheet
            products: List of dictionaries with 'row' and 'data' keys
        """
        if not products:
            return
        
        try:
            data = []
            for product in products:
                row_number = product['row']
                product_data = product['data']
                
                data.append({
                    'range': f"{sheet_name}!A{row_number}:E{row_number}",
                    'values': [[
                        product_data.get('name', ''),
                        product_data.get('price', ''),
                        product_data.get('description', ''),
                        product_data.get('image', ''),
                        product_data.get('link', '')
                    ]]
                })
            
            body = {
                'valueInputOption': 'RAW',
                'data': data
            }
            
            result = self.service.spreadsheets().values().batchUpdate(
                spreadsheetId=self.spreadsheet_id,
                body=body
            ).execute()
            
            print(f"Batch update complete: {result.get('totalUpdatedCells')} cells updated.")
            
        except HttpError as err:
            print(f"An error occurred: {err}")
