"""
Base scraper class with Selenium support for dynamic content loading
"""
from abc import ABC, abstractmethod
from selenium import webdriver
from selenium.webdriver.chrome.service import Service
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from webdriver_manager.chrome import ChromeDriverManager
from bs4 import BeautifulSoup
import time
import re


class BaseScraper(ABC):
    """Base class for all website scrapers"""
    
    def __init__(self, headless=True):
        """
        Initialize the scraper with Selenium WebDriver
        
        Args:
            headless: Whether to run browser in headless mode
        """
        self.headless = headless
        self.driver = None
    
    def _init_driver(self):
        """Initialize Selenium WebDriver"""
        if self.driver is None:
            chrome_options = Options()
            if self.headless:
                chrome_options.add_argument('--headless')
            chrome_options.add_argument('--no-sandbox')
            chrome_options.add_argument('--disable-dev-shm-usage')
            chrome_options.add_argument('--disable-gpu')
            chrome_options.add_argument('--window-size=1920,1080')
            chrome_options.add_argument('--user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36')
            
            service = Service(ChromeDriverManager().install())
            self.driver = webdriver.Chrome(service=service, options=chrome_options)
    
    def _close_driver(self):
        """Close Selenium WebDriver"""
        if self.driver:
            self.driver.quit()
            self.driver = None
    
    def scrape(self, url):
        """
        Main scraping method
        
        Args:
            url: URL to scrape
        
        Returns:
            Dictionary with scraped data: name, price, description, image, link
        """
        try:
            self._init_driver()
            return self._scrape_product(url)
        except Exception as e:
            print(f"Error scraping {url}: {e}")
            return {
                'name': 'Error',
                'price': '',
                'description': str(e),
                'image': '',
                'link': url
            }
        finally:
            self._close_driver()
    
    @abstractmethod
    def _scrape_product(self, url):
        """
        Abstract method to be implemented by specific scrapers
        
        Args:
            url: URL to scrape
        
        Returns:
            Dictionary with scraped data
        """
        pass
    
    def _wait_for_element(self, by, value, timeout=10):
        """Wait for an element to be present"""
        try:
            element = WebDriverWait(self.driver, timeout).until(
                EC.presence_of_element_located((by, value))
            )
            return element
        except:
            return None
    
    def _get_soup(self):
        """Get BeautifulSoup object from current page"""
        return BeautifulSoup(self.driver.page_source, 'lxml')
    
    def _clean_price(self, price_text):
        """Clean and extract price from text"""
        if not price_text:
            return ''
        
        # Remove currency symbols and extract number
        price_match = re.search(r'\$?\s*(\d+[\d,]*\.?\d*)', price_text.replace(',', ''))
        if price_match:
            return f"${price_match.group(1)}"
        return price_text.strip()
    
    def _clean_text(self, text):
        """Clean text by removing extra whitespace"""
        if not text:
            return ''
        return ' '.join(text.split())


class GunMagWarehouseScraper(BaseScraper):
    """Scraper for GunMagWarehouse.com"""
    
    def _scrape_product(self, url):
        self.driver.get(url)
        time.sleep(2)  # Wait for dynamic content
        
        soup = self._get_soup()
        
        # Extract product information
        name = ''
        price = ''
        description = ''
        image = ''
        
        # Name - common selectors for product titles
        name_selectors = [
            'h1.product-title',
            'h1.product-name',
            'h1[itemprop="name"]',
            '.product-title',
            'h1'
        ]
        for selector in name_selectors:
            element = soup.select_one(selector)
            if element:
                name = self._clean_text(element.get_text())
                break
        
        # Price
        price_selectors = [
            '.product-price',
            '[itemprop="price"]',
            '.price',
            'span.price'
        ]
        for selector in price_selectors:
            element = soup.select_one(selector)
            if element:
                price = self._clean_price(element.get_text())
                break
        
        # Description
        desc_selectors = [
            '.product-description',
            '[itemprop="description"]',
            '.description',
            '.product-info'
        ]
        for selector in desc_selectors:
            element = soup.select_one(selector)
            if element:
                description = self._clean_text(element.get_text())[:500]  # Limit length
                break
        
        # Image
        img_selectors = [
            '.product-image img',
            '[itemprop="image"]',
            '.product-img img',
            'img.product'
        ]
        for selector in img_selectors:
            element = soup.select_one(selector)
            if element:
                image = element.get('src', '') or element.get('data-src', '')
                break
        
        return {
            'name': name,
            'price': price,
            'description': description,
            'image': image,
            'link': url
        }


class EbayScraper(BaseScraper):
    """Scraper for eBay"""
    
    def _scrape_product(self, url):
        self.driver.get(url)
        time.sleep(2)
        
        soup = self._get_soup()
        
        name = ''
        price = ''
        description = ''
        image = ''
        
        # eBay specific selectors
        name_elem = soup.select_one('h1.x-item-title__mainTitle')
        if name_elem:
            name = self._clean_text(name_elem.get_text())
        
        price_elem = soup.select_one('.x-price-primary span.ux-textspans')
        if price_elem:
            price = self._clean_price(price_elem.get_text())
        
        desc_elem = soup.select_one('.ux-layout-section__item--description')
        if desc_elem:
            description = self._clean_text(desc_elem.get_text())[:500]
        
        img_elem = soup.select_one('.ux-image-carousel-item img')
        if img_elem:
            image = img_elem.get('src', '')
        
        return {
            'name': name,
            'price': price,
            'description': description,
            'image': image,
            'link': url
        }


class AmazonScraper(BaseScraper):
    """Scraper for Amazon"""
    
    def _scrape_product(self, url):
        self.driver.get(url)
        time.sleep(3)  # Amazon needs more time to load
        
        soup = self._get_soup()
        
        name = ''
        price = ''
        description = ''
        image = ''
        
        # Amazon specific selectors
        name_elem = soup.select_one('#productTitle')
        if name_elem:
            name = self._clean_text(name_elem.get_text())
        
        # Try multiple price selectors
        price_selectors = [
            '.a-price span.a-offscreen',
            '#priceblock_ourprice',
            '#priceblock_dealprice',
            '.a-price-whole'
        ]
        for selector in price_selectors:
            price_elem = soup.select_one(selector)
            if price_elem:
                price = self._clean_price(price_elem.get_text())
                break
        
        # Description/Features
        desc_elem = soup.select_one('#feature-bullets')
        if desc_elem:
            description = self._clean_text(desc_elem.get_text())[:500]
        
        # Image
        img_elem = soup.select_one('#landingImage')
        if img_elem:
            image = img_elem.get('src', '') or img_elem.get('data-old-hires', '')
        
        return {
            'name': name,
            'price': price,
            'description': description,
            'image': image,
            'link': url
        }


class AcademyScraper(BaseScraper):
    """Scraper for Academy Sports + Outdoors"""
    
    def _scrape_product(self, url):
        self.driver.get(url)
        time.sleep(2)
        
        soup = self._get_soup()
        
        name = ''
        price = ''
        description = ''
        image = ''
        
        # Academy specific selectors
        name_elem = soup.select_one('h1.product-name')
        if not name_elem:
            name_elem = soup.select_one('[data-testid="product-name"]')
        if name_elem:
            name = self._clean_text(name_elem.get_text())
        
        price_elem = soup.select_one('.price-value')
        if not price_elem:
            price_elem = soup.select_one('[data-testid="price"]')
        if price_elem:
            price = self._clean_price(price_elem.get_text())
        
        desc_elem = soup.select_one('.product-description')
        if not desc_elem:
            desc_elem = soup.select_one('[data-testid="product-description"]')
        if desc_elem:
            description = self._clean_text(desc_elem.get_text())[:500]
        
        img_elem = soup.select_one('.product-image img')
        if not img_elem:
            img_elem = soup.select_one('[data-testid="product-image"]')
        if img_elem:
            image = img_elem.get('src', '')
        
        return {
            'name': name,
            'price': price,
            'description': description,
            'image': image,
            'link': url
        }
