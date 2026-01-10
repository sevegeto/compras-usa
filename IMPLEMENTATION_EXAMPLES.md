# IMPLEMENTATION EXAMPLES

## Python with Selenium (Recommended for complex sites)

```python
from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
import json
import time

class ProductScraper:
    def __init__(self):
        self.driver = webdriver.Chrome()
        
    def extract_structured_data(self):
        """Extract JSON-LD structured data (works for all sites)"""
        script = self.driver.find_element(
            By.CSS_SELECTOR, 
            'script[type="application/ld+json"]'
        )
        data = json.loads(script.get_attribute('textContent'))
        return data
    
    def scrape_amazon(self, url):
        self.driver.get(url)
        WebDriverWait(self.driver, 10).until(
            EC.presence_of_element_located((By.ID, "productTitle"))
        )
        
        result = {
            'title': self.driver.find_element(By.ID, "productTitle").text,
            'price': '',
            'availability': '',
            'image': self.driver.find_element(By.ID, "landingImage").get_attribute('src')
        }
        
        # Extract price (may have whole and fraction)
        try:
            price_whole = self.driver.find_element(
                By.CSS_SELECTOR, 
                'span.a-price-whole'
            ).text
            result['price'] = price_whole
        except:
            pass
        
        # Extract availability
        try:
            availability = self.driver.find_element(
                By.CSS_SELECTOR, 
                'div#availability span'
            ).text
            result['availability'] = availability
        except:
            result['availability'] = 'Unknown'
        
        return result
    
    def scrape_academy(self, url):
        self.driver.get(url)
        WebDriverWait(self.driver, 10).until(
            EC.presence_of_element_located((By.TAG_NAME, "h1"))
        )
        
        # Get title from meta or h1
        title_elem = self.driver.find_element(
            By.CSS_SELECTOR, 
            'h1[data-auid="title"], h1'
        )
        
        result = {
            'title': title_elem.text,
            'price': '',
            'availability': '',
            'image': ''
        }
        
        # Try multiple price selectors
        price_selectors = [
            'span[class*="price"]',
            '.product-price',
            '[data-auid*="price"]'
        ]
        
        for selector in price_selectors:
            try:
                price_elem = self.driver.find_element(By.CSS_SELECTOR, selector)
                result['price'] = price_elem.text
                break
            except:
                continue
        
        # Get image
        try:
            img = self.driver.find_element(
                By.CSS_SELECTOR, 
                'img[src*="academy.scene7.com"]'
            )
            result['image'] = img.get_attribute('src')
        except:
            pass
        
        # Get availability
        try:
            availability = self.driver.find_element(
                By.CSS_SELECTOR, 
                '[class*="availability"], [class*="stock"]'
            ).text
            result['availability'] = availability
        except:
            result['availability'] = 'Unknown'
        
        return result
    
    def scrape_ebay(self, url):
        self.driver.get(url)
        WebDriverWait(self.driver, 10).until(
            EC.presence_of_element_located((By.ID, "itemTitle"))
        )
        
        result = {
            'title': self.driver.find_element(By.ID, "itemTitle").text,
            'price': '',
            'availability': '',
            'image': ''
        }
        
        # Get main image
        try:
            img = self.driver.find_element(By.ID, "vi_main")
            result['image'] = img.get_attribute('src')
        except:
            pass
        
        # Get price
        try:
            price = self.driver.find_element(
                By.CSS_SELECTOR, 
                'span.notranslate.vi-VR-cvipPrice'
            ).text
            result['price'] = price
        except:
            pass
        
        # Get availability
        try:
            availability = self.driver.find_element(
                By.CSS_SELECTOR, 
                '[class*="vi-acc-del-range"]'
            ).text
            result['availability'] = availability
        except:
            if 'out of stock' in self.driver.page_source.lower():
                result['availability'] = 'Out of Stock'
            else:
                result['availability'] = 'In Stock'
        
        return result
    
    def scrape_mercadolibre(self, url):
        self.driver.get(url)
        time.sleep(3)  # Wait for React to render
        
        # Try to get structured data first
        try:
            structured_data = self.extract_structured_data()
            return {
                'title': structured_data.get('name', ''),
                'price': str(structured_data.get('offers', {}).get('price', '')),
                'availability': structured_data.get('offers', {}).get('availability', ''),
                'image': structured_data.get('image', [''])[0]
            }
        except:
            pass
        
        # Fallback to CSS selectors
        result = {
            'title': '',
            'price': '',
            'availability': '',
            'image': ''
        }
        
        try:
            result['title'] = self.driver.find_element(
                By.CSS_SELECTOR, 
                'h1[class*="title"], h1'
            ).text
        except:
            pass
        
        try:
            result['price'] = self.driver.find_element(
                By.CSS_SELECTOR, 
                'span[class*="price"]'
            ).text
        except:
            pass
        
        try:
            result['image'] = self.driver.find_element(
                By.CSS_SELECTOR, 
                'img[src*="mlstatic.com"]'
            ).get_attribute('src')
        except:
            pass
        
        try:
            result['availability'] = self.driver.find_element(
                By.CSS_SELECTOR, 
                'span[class*="stock"]'
            ).text
        except:
            result['availability'] = 'Unknown'
        
        return result
    
    def close(self):
        self.driver.quit()


# Usage
if __name__ == "__main__":
    scraper = ProductScraper()
    
    # Amazon
    amazon_data = scraper.scrape_amazon("https://www.amazon.com/dp/B00P5CEJ46")
    print("Amazon:", amazon_data)
    
    # Academy
    academy_data = scraper.scrape_academy(
        "https://www.academy.com/p/magellan-outdoors-camo-day-pack"
    )
    print("Academy:", academy_data)
    
    # eBay
    ebay_data = scraper.scrape_ebay(
        "https://www.ebay.com/itm/136817975878?var=435369828258"
    )
    print("eBay:", ebay_data)
    
    # Mercado Libre
    ml_data = scraper.scrape_mercadolibre(
        "https://www.mercadolibre.com.mx/colimador-alineador-o-regimador-flecha-arco-ballesta-mira/up/MLMU3460266580"
    )
    print("Mercado Libre:", ml_data)
    
    scraper.close()
```

---

## JavaScript/Node.js with Puppeteer

```javascript
const puppeteer = require('puppeteer');

class ProductScraper {
    async initialize() {
        this.browser = await puppeteer.launch({ headless: true });
    }

    async extractStructuredData(page) {
        return await page.evaluate(() => {
            const script = document.querySelector('script[type="application/ld+json"]');
            if (script) {
                try {
                    return JSON.parse(script.textContent);
                } catch (e) {
                    return null;
                }
            }
            return null;
        });
    }

    async scrapeAmazon(url) {
        const page = await this.browser.newPage();
        await page.goto(url, { waitUntil: 'networkidle2' });

        const result = await page.evaluate(() => {
            const title = document.querySelector('span#productTitle')?.textContent?.trim() || '';
            
            const priceWhole = document.querySelector('span.a-price-whole')?.textContent?.trim() || '';
            const priceFraction = document.querySelector('span.a-price-fraction')?.textContent?.trim() || '';
            const price = (priceWhole + priceFraction).trim();
            
            const availability = document.querySelector('div#availability span')?.textContent?.trim() || 'Unknown';
            
            const image = document.querySelector('img#landingImage')?.src || '';

            return { title, price, availability, image };
        });

        await page.close();
        return result;
    }

    async scrapeAcademy(url) {
        const page = await this.browser.newPage();
        await page.goto(url, { waitUntil: 'networkidle2' });

        const result = await page.evaluate(() => {
            const title = document.querySelector('h1[data-auid="title"]')?.textContent?.trim() ||
                         document.querySelector('h1')?.textContent?.trim() || '';

            let price = '';
            const priceElements = document.querySelectorAll('span[class*="price"]');
            if (priceElements.length > 0) {
                price = priceElements[0].textContent.trim();
            }

            const availability = document.querySelector('[class*="availability"]')?.textContent?.trim() ||
                                document.querySelector('[class*="stock"]')?.textContent?.trim() ||
                                'Unknown';

            const image = document.querySelector('img[src*="academy.scene7.com"]')?.src || '';

            return { title, price, availability, image };
        });

        await page.close();
        return result;
    }

    async scrapeEbay(url) {
        const page = await this.browser.newPage();
        await page.goto(url, { waitUntil: 'networkidle2' });

        const result = await page.evaluate(() => {
            const title = document.querySelector('h1#itemTitle')?.textContent?.trim() || '';

            const price = document.querySelector('span.notranslate.vi-VR-cvipPrice')?.textContent?.trim() ||
                         document.querySelector('span[id*="prcIsum"]')?.textContent?.trim() || '';

            const availability = document.querySelector('[class*="vi-acc-del-range"]')?.textContent?.trim() ||
                                (document.body.innerText.includes('Out of stock') ? 'Out of Stock' : 'In Stock');

            const image = document.querySelector('img#vi_main')?.src || '';

            return { title, price, availability, image };
        });

        await page.close();
        return result;
    }

    async scrapeMercadoLibre(url) {
        const page = await this.browser.newPage();
        await page.goto(url, { waitUntil: 'networkidle2' });
        
        // Try structured data first
        let structuredData = await this.extractStructuredData(page);
        if (structuredData && structuredData['@type'] === 'Product') {
            const offers = structuredData.offers || {};
            return {
                title: structuredData.name || '',
                price: String(offers.price || ''),
                availability: offers.availability || 'Unknown',
                image: Array.isArray(structuredData.image) ? 
                       structuredData.image[0] : 
                       structuredData.image || ''
            };
        }

        // Fallback to CSS selectors
        const result = await page.evaluate(() => {
            const title = document.querySelector('h1[class*="title"]')?.textContent?.trim() ||
                         document.querySelector('h1')?.textContent?.trim() || '';

            const price = document.querySelector('span[class*="price"]')?.textContent?.trim() || '';

            const availability = document.querySelector('span[class*="stock"]')?.textContent?.trim() || 'Unknown';

            const image = document.querySelector('img[src*="mlstatic.com"]')?.src || '';

            return { title, price, availability, image };
        });

        await page.close();
        return result;
    }

    async close() {
        await this.browser.close();
    }
}

// Usage
(async () => {
    const scraper = new ProductScraper();
    await scraper.initialize();

    console.log('Amazon:', await scraper.scrapeAmazon('https://www.amazon.com/dp/B00P5CEJ46'));
    console.log('Academy:', await scraper.scrapeAcademy('https://www.academy.com/p/magellan-outdoors-camo-day-pack'));
    console.log('eBay:', await scraper.scrapeEbay('https://www.ebay.com/itm/136817975878?var=435369828258'));
    console.log('Mercado Libre:', await scraper.scrapeMercadoLibre('https://www.mercadolibre.com.mx/...'));

    await scraper.close();
})();
```

---

## Simple HTML Parser (beautifulsoup4 / no JavaScript)

```python
from bs4 import BeautifulSoup
import requests
from urllib.parse import urljoin
import json
import re

class SimpleProductExtractor:
    """For sites with server-rendered HTML (limited effectiveness)"""
    
    def __init__(self):
        self.headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
    
    def get_html(self, url):
        response = requests.get(url, headers=self.headers, timeout=10)
        response.raise_for_status()
        return response.text
    
    def extract_json_ld(self, soup):
        """Extract structured data from JSON-LD"""
        for script in soup.find_all('script', {'type': 'application/ld+json'}):
            try:
                return json.loads(script.string)
            except:
                continue
        return None
    
    def extract_meta_tags(self, soup):
        """Extract from meta tags"""
        return {
            'title': soup.find('meta', {'property': 'og:title'})?.get('content') or soup.title?.string,
            'image': soup.find('meta', {'property': 'og:image'})?.get('content'),
            'description': soup.find('meta', {'name': 'description'})?.get('content'),
            'price': soup.find('meta', {'property': 'og:price:amount'})?.get('content'),
        }
    
    def scrape_amazon_simple(self, url):
        html = self.get_html(url)
        soup = BeautifulSoup(html, 'html.parser')
        
        return {
            'title': soup.find('span', {'id': 'productTitle'})?.get_text(strip=True) or '',
            'price': self._extract_price_amazon(soup),
            'availability': soup.find('div', {'id': 'availability'})?.get_text(strip=True) or '',
            'image': soup.find('img', {'id': 'landingImage'})?.get('src') or '',
        }
    
    def scrape_ebay_simple(self, url):
        html = self.get_html(url)
        soup = BeautifulSoup(html, 'html.parser')
        
        return {
            'title': soup.find('h1', {'id': 'itemTitle'})?.get_text(strip=True) or '',
            'price': soup.find('span', {'class': 'notranslate'})?.get_text(strip=True) or '',
            'availability': 'In Stock' if 'out of stock' not in html.lower() else 'Out of Stock',
            'image': soup.find('img', {'id': 'vi_main'})?.get('src') or '',
        }
    
    def scrape_mercadolibre_simple(self, url):
        html = self.get_html(url)
        soup = BeautifulSoup(html, 'html.parser')
        
        # Try JSON-LD first
        structured = self.extract_json_ld(soup)
        if structured and structured.get('@type') == 'Product':
            offers = structured.get('offers', {})
            return {
                'title': structured.get('name', ''),
                'price': str(offers.get('price', '')),
                'availability': offers.get('availability', 'Unknown'),
                'image': structured.get('image', [''])[0] if isinstance(structured.get('image'), list) else structured.get('image', ''),
            }
        
        # Fallback to meta tags
        return self.extract_meta_tags(soup)
    
    @staticmethod
    def _extract_price_amazon(soup):
        """Extract Amazon price from multiple possible locations"""
        price_whole = soup.find('span', {'class': 'a-price-whole'})
        price_fraction = soup.find('span', {'class': 'a-price-fraction'})
        
        if price_whole:
            whole = price_whole.get_text(strip=True).replace(',', '')
            fraction = price_fraction.get_text(strip=True) if price_fraction else ''
            return (whole + fraction).replace('$', '')
        return ''

# Usage
if __name__ == "__main__":
    extractor = SimpleProductExtractor()
    
    try:
        amazon = extractor.scrape_amazon_simple('https://www.amazon.com/dp/B00P5CEJ46')
        print("Amazon:", amazon)
    except Exception as e:
        print(f"Amazon error: {e}")
    
    try:
        ebay = extractor.scrape_ebay_simple('https://www.ebay.com/itm/136817975878')
        print("eBay:", ebay)
    except Exception as e:
        print(f"eBay error: {e}")
    
    try:
        ml = extractor.scrape_mercadolibre_simple('https://www.mercadolibre.com.mx/...')
        print("Mercado Libre:", ml)
    except Exception as e:
        print(f"Mercado Libre error: {e}")
```

---

## Browser Console Testing (Quick Verification)

```javascript
// Test all selectors for a page

// AMAZON
{
  title: document.querySelector('span#productTitle')?.textContent.trim(),
  price: document.querySelector('span.a-price-whole')?.textContent.trim(),
  availability: document.querySelector('div#availability span')?.textContent.trim(),
  image: document.querySelector('img#landingImage')?.src,
}

// ACADEMY
{
  title: document.querySelector('h1[data-auid="title"]')?.textContent.trim(),
  price: Array.from(document.querySelectorAll('span[class*="price"]')).map(e => e.textContent.trim())[0],
  availability: document.querySelector('[class*="stock"]')?.textContent.trim(),
  image: document.querySelector('img[src*="academy.scene7.com"]')?.src,
}

// EBAY
{
  title: document.querySelector('h1#itemTitle')?.textContent.trim(),
  price: document.querySelector('span.notranslate.vi-VR-cvipPrice')?.textContent.trim(),
  availability: document.querySelector('[class*="vi-acc-del-range"]')?.textContent.trim() || 'In Stock',
  image: document.querySelector('img#vi_main')?.src,
}

// MERCADO LIBRE
{
  title: document.querySelector('h1[class*="title"]')?.textContent.trim(),
  price: Array.from(document.querySelectorAll('span[class*="price"]')).map(e => e.textContent.trim())[0],
  availability: document.querySelector('span[class*="stock"]')?.textContent.trim(),
  image: document.querySelector('img[src*="mlstatic.com"]')?.src,
}
```

---

## Recommendations

1. **Start with Puppeteer/Selenium** for maximum compatibility
2. **Use JSON-LD when available** (most reliable)
3. **Implement fallback chains** for robustness
4. **Cache successful selectors** to improve performance
5. **Add error logging** to track failures
6. **Test regularly** as sites update their HTML
7. **Respect robots.txt** and rate limits
8. **Consider API alternatives** if available
