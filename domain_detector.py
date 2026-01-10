"""
Domain detector - automatically identifies the domain from a URL
"""
from urllib.parse import urlparse


class DomainDetector:
    """Detects the domain from a URL and returns the appropriate scraper"""
    
    DOMAIN_MAPPING = {
        'gunmagwarehouse.com': 'gunmagwarehouse',
        'ebay.com': 'ebay',
        'amazon.com': 'amazon',
        'academy.com': 'academy',
    }
    
    @staticmethod
    def detect_domain(url):
        """
        Detect the domain from a URL
        
        Args:
            url: The URL to analyze
        
        Returns:
            Domain identifier string (e.g., 'ebay', 'amazon', etc.) or 'unknown'
        """
        try:
            parsed = urlparse(url)
            domain = parsed.netloc.lower()
            
            # Remove 'www.' prefix if present
            if domain.startswith('www.'):
                domain = domain[4:]
            
            # Check if domain matches any known domains
            for known_domain, identifier in DomainDetector.DOMAIN_MAPPING.items():
                if known_domain in domain:
                    return identifier
            
            return 'unknown'
        
        except Exception as e:
            print(f"Error detecting domain for {url}: {e}")
            return 'unknown'
    
    @staticmethod
    def get_scraper_class(domain_identifier):
        """
        Get the scraper class for a given domain identifier
        
        Args:
            domain_identifier: The domain identifier (e.g., 'ebay', 'amazon')
        
        Returns:
            Scraper class or None if unknown
        """
        from scrapers import (
            GunMagWarehouseScraper,
            EbayScraper,
            AmazonScraper,
            AcademyScraper
        )
        
        scraper_map = {
            'gunmagwarehouse': GunMagWarehouseScraper,
            'ebay': EbayScraper,
            'amazon': AmazonScraper,
            'academy': AcademyScraper,
        }
        
        return scraper_map.get(domain_identifier)
