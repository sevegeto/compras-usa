"""
Main script to orchestrate the web scraping process
Reads URLs from Google Sheets, scrapes product data, and writes back to Sheets
"""
import argparse
import sys
from sheets_client import GoogleSheetsClient
from domain_detector import DomainDetector


def main():
    """Main function to run the scraping process"""
    
    parser = argparse.ArgumentParser(
        description='Scrape product data from URLs in Google Sheets'
    )
    parser.add_argument(
        'spreadsheet_id',
        help='Google Sheets spreadsheet ID'
    )
    parser.add_argument(
        '--sheet',
        default='Compras',
        help='Sheet name (default: Compras)'
    )
    parser.add_argument(
        '--column',
        default='H',
        help='Column letter containing URLs (default: H)'
    )
    parser.add_argument(
        '--start-row',
        type=int,
        default=3,
        help='Starting row number (default: 3)'
    )
    parser.add_argument(
        '--headless',
        action='store_true',
        default=True,
        help='Run browser in headless mode (default: True)'
    )
    
    args = parser.parse_args()
    
    print("=" * 60)
    print("Web Scraping Tool for Google Sheets")
    print("=" * 60)
    print(f"Spreadsheet ID: {args.spreadsheet_id}")
    print(f"Sheet: {args.sheet}")
    print(f"Column: {args.column}")
    print(f"Starting row: {args.start_row}")
    print("=" * 60)
    
    # Initialize Google Sheets client
    try:
        sheets_client = GoogleSheetsClient(args.spreadsheet_id)
        print("✓ Connected to Google Sheets")
    except Exception as e:
        print(f"✗ Error connecting to Google Sheets: {e}")
        print("\nMake sure you have:")
        print("1. Created credentials.json in the current directory")
        print("2. Enabled the Google Sheets API in your Google Cloud project")
        sys.exit(1)
    
    # Read URLs from the specified column
    print(f"\nReading URLs from column {args.column}...")
    urls = sheets_client.read_urls_from_column(
        sheet_name=args.sheet,
        column=args.column,
        start_row=args.start_row
    )
    
    if not urls:
        print("No URLs found in the specified column.")
        sys.exit(0)
    
    print(f"Found {len(urls)} URL(s) to scrape")
    
    # Process each URL
    results = []
    for row_number, url in urls:
        print(f"\n{'=' * 60}")
        print(f"Processing row {row_number}: {url}")
        
        # Detect domain
        domain = DomainDetector.detect_domain(url)
        print(f"Detected domain: {domain}")
        
        # Get appropriate scraper
        scraper_class = DomainDetector.get_scraper_class(domain)
        
        if scraper_class is None:
            print(f"✗ Unsupported domain: {domain}")
            results.append({
                'row': row_number,
                'data': {
                    'name': 'Unsupported domain',
                    'price': '',
                    'description': f'Domain {domain} is not supported yet',
                    'image': '',
                    'link': url
                }
            })
            continue
        
        # Scrape the product
        print(f"Scraping with {scraper_class.__name__}...")
        try:
            scraper = scraper_class(headless=args.headless)
            product_data = scraper.scrape(url)
            
            if product_data['name']:
                print(f"✓ Successfully scraped: {product_data['name']}")
                print(f"  Price: {product_data['price']}")
            else:
                print("✗ Could not extract product data")
            
            results.append({
                'row': row_number,
                'data': product_data
            })
        except Exception as e:
            print(f"✗ Error scraping: {e}")
            results.append({
                'row': row_number,
                'data': {
                    'name': 'Error',
                    'price': '',
                    'description': str(e),
                    'image': '',
                    'link': url
                }
            })
    
    # Write results back to Google Sheets
    print(f"\n{'=' * 60}")
    print("Writing results to Google Sheets...")
    
    if results:
        sheets_client.batch_write_products(
            sheet_name=args.sheet,
            products=results
        )
        print("✓ All data written to Google Sheets")
    
    print(f"\n{'=' * 60}")
    print(f"Scraping complete! Processed {len(results)} URL(s)")
    print("=" * 60)


if __name__ == '__main__':
    main()
