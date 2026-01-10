"""
Web scraper para múltiples sitios web (GunMagWarehouse, eBay, Amazon, Academy, MercadoLibre)
con integración a Google Sheets.

Mejoras de esta versión:
- Normalización de URLs de imágenes (https://).
- Limpieza de precios robusta (solo primer bloque numérico).
- Academy: Selectores de precio y atributos actualizados.
- eBay: Soporte para atributos en páginas de variantes.
"""

import os
import sys
import time
import logging
import json
import re
from typing import List, Dict, Optional, Any
from datetime import datetime
from urllib.parse import urlparse

from selenium import webdriver
from selenium.webdriver.chrome.service import Service
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.common.exceptions import TimeoutException, WebDriverException
from bs4 import BeautifulSoup
import gspread
from oauth2client.service_account import ServiceAccountCredentials
from dotenv import load_dotenv


# ==============================
# CONFIGURACIÓN Y CONSTANTES
# ==============================

load_dotenv()

GOOGLE_SHEET_ID = os.getenv('GOOGLE_SHEET_ID')
SHEET_NAME = os.getenv('SHEET_NAME', 'Compras')
CREDENTIALS_PATH = os.getenv('CREDENTIALS_PATH')
CHROMEDRIVER_PATH = os.getenv('CHROMEDRIVER_PATH')
HEADLESS_MODE = os.getenv('HEADLESS_MODE', 'True').lower() == 'true'
PAGE_LOAD_TIMEOUT = 60
IMPLICIT_WAIT = 20

LOG_LEVEL = os.getenv('LOG_LEVEL', 'INFO')
LOG_FILE = 'scraper.log'

def setup_logging() -> logging.Logger:
    logger = logging.getLogger('web_scraper')
    logger.setLevel(getattr(logging, LOG_LEVEL))
    if logger.handlers: return logger
    formatter = logging.Formatter('%(asctime)s - %(levelname)s - %(message)s')
    fh = logging.FileHandler(LOG_FILE, encoding='utf-8')
    fh.setFormatter(formatter)
    logger.addHandler(fh)
    ch = logging.StreamHandler(sys.stdout)
    ch.setFormatter(formatter)
    logger.addHandler(ch)
    return logger

logger = setup_logging()

# ==============================
# GESTORES DE CONEXIÓN
# ==============================

class GoogleSheetsManager:
    def __init__(self):
        self.sheet = None
    
    def conectar(self):
        try:
            scope = ["https://spreadsheets.google.com/feeds", "https://www.googleapis.com/auth/drive"]
            creds = ServiceAccountCredentials.from_json_keyfile_name(CREDENTIALS_PATH, scope)
            client = gspread.authorize(creds)
            self.sheet = client.open_by_key(GOOGLE_SHEET_ID).worksheet(SHEET_NAME)
            return self.sheet
        except Exception as e:
            logger.error(f"Error Sheets: {e}")
            raise

    def guardar_datos(self, datos: List[List[Any]]):
        if not self.sheet: self.conectar()
        valores = self.sheet.get_all_values()
        row = max(6, len(valores) + 1)
        if datos:
            self.sheet.update(values=datos, range_name=f'A{row}')

class SeleniumDriver:
    def inicializar(self):
        chrome_options = Options()
        if HEADLESS_MODE: chrome_options.add_argument("--headless")
        chrome_options.add_argument("--disable-gpu")
        chrome_options.add_argument("--no-sandbox")
        chrome_options.add_argument("--window-size=1920,1080")
        chrome_options.add_argument("--disable-blink-features=AutomationControlled")
        chrome_options.add_argument("user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36")
        service = Service(CHROMEDRIVER_PATH)
        driver = webdriver.Chrome(service=service, options=chrome_options)
        driver.set_page_load_timeout(PAGE_LOAD_TIMEOUT)
        return driver

# ==============================
# SCRAPERS MEJORADOS
# ==============================

class BaseScraper:
    def __init__(self, driver):
        self.driver = driver
    
    def _clean(self, text):
        if not text: return "N/A"
        text = "".join(ch for ch in text if ch.isprintable())
        return re.sub(r'\s+', ' ', text).strip()

    def _normalize_url(self, url):
        if not url or url == "N/A": return ""
        if url.startswith("//"): return "https:" + url
        return url

    def get_attr_case_insensitive(self, attrs, key_patterns):
        for k, v in attrs.items():
            for pattern in key_patterns:
                if pattern.lower() in k.lower():
                    return v
        return "N/A"

class AmazonScraper(BaseScraper):
    def extraer(self, url):
        self.driver.get(url)
        time.sleep(3)
        soup = BeautifulSoup(self.driver.page_source, 'html.parser')
        
        title = self._clean(soup.find('span', {'id': 'productTitle'}).text) if soup.find('span', {'id': 'productTitle'}) else "N/A"
        
        price = "N/A"
        price_selectors = [
            'span.a-price span.a-offscreen',
            'span#price_inside_buybox',
            'span.a-color-price',
            '#corePrice_feature_div .a-offscreen'
        ]
        for sel in price_selectors:
            elem = soup.select_one(sel)
            if elem:
                price = self._clean(elem.text)
                break

        images = []
        ic = soup.find('div', {'id': 'altImages'})
        if ic:
            for img in ic.find_all('img'):
                src = img.get('src')
                if src and not any(x in src.lower() for x in ['icon', '360', 'play-button', 'video', 'base64']):
                    images.append(self._normalize_url(re.sub(r'\._AC_.*_\.', '.', src)))
        
        if not images:
            mi = soup.find('img', {'id': 'landingImage'})
            if mi: images.append(self._normalize_url(mi.get('src')))

        attrs = {}
        for row in soup.select('table.a-keyvalue tr, #productDetails_techSpec_section_1 tr'):
            th, td = row.find('th'), row.find('td')
            if th and td: attrs[self._clean(th.text)] = self._clean(td.text)
        
        bullets = [self._clean(li.text) for li in soup.select('#feature-bullets li')]
        description = "\n".join(bullets) if bullets else self._clean(soup.select_one('#productDescription p').text if soup.select_one('#productDescription p') else "")
        
        vendor = "Amazon"
        mi_info = soup.find('div', {'id': 'merchant-info'})
        if mi_info and mi_info.find('a'): vendor = self._clean(mi_info.find('a').text)

        return {
            'nombre': title, 'precio': price, 'url': url, 'sitio': 'Amazon',
            'imagenes': images, 'atributos': attrs, 'vendedor': vendor,
            'descripcion': description, 'fecha': datetime.now().strftime('%Y-%m-%d %H:%M:%S')
        }

class EbayScraper(BaseScraper):
    def extraer(self, url):
        self.driver.get(url)
        time.sleep(3)
        soup = BeautifulSoup(self.driver.page_source, 'html.parser')
        
        title = self._clean(soup.find('h1', {'class': 'x-item-title__mainTitle'}).text) if soup.find('h1', {'class': 'x-item-title__mainTitle'}) else "N/A"
        
        price = "N/A"
        pe = soup.find('div', {'class': 'x-price-primary'}) or soup.find('span', {'itemprop': 'price'})
        if pe: price = self._clean(pe.text)

        images = []
        for img in soup.select('.ux-image-carousel img, .picture-wrapper img, .mainImg img'):
            src = img.get('src') or img.get('data-src') or img.get('data-zoom-src')
            if src and not src.startswith('data:'): 
                images.append(self._normalize_url(src.replace('s-l64', 's-l1600').replace('s-l500', 's-l1600')))

        attrs = {}
        # Selectores expandidos para eBay
        spec_rows = soup.select('.ux-layout-section--itemSpecifics .ux-labels-values, .vi-ia-attrRow tr, .itemSpecifics tr')
        for row in spec_rows:
            label = row.find('div', class_='ux-labels-values__labels') or row.find('th') or row.find('td', class_='attrLabels')
            value = row.find('div', class_='ux-labels-values__values') or row.find('td')
            if label and value:
                attrs[self._clean(label.text)] = self._clean(value.text)

        vendor = "N/A"
        sl = soup.find('div', {'class': 'x-sellercard-atf__info__about-seller'}) or soup.find('span', class_='mbg-nw')
        if sl:
            vendor_link = sl.find('a')
            vendor = self._clean(vendor_link.text if vendor_link else sl.text)

        return {
            'nombre': title, 'precio': price, 'url': url, 'sitio': 'eBay',
            'imagenes': images, 'atributos': attrs, 'vendedor': vendor,
            'descripcion': title, 'fecha': datetime.now().strftime('%Y-%m-%d %H:%M:%S')
        }

class AcademyScraper(BaseScraper):
    def extraer(self, url):
        self.driver.get(url)
        time.sleep(8)
        soup = BeautifulSoup(self.driver.page_source, 'html.parser')
        
        title_meta = soup.find('meta', property='og:title')
        title = self._clean(title_meta.get('content') if title_meta else "")
        if not title or title == "N/A":
            title_elem = soup.find('h1', {'data-auid': 'product-detail-title'}) or soup.find('h1', {'data-auid': 'productTitle'})
            title = self._clean(title_elem.text) if title_elem else "N/A"
        
        price = "N/A"
        # Academy CSS classes are frequently hashed, using data-auid and specific price classes
        pe = soup.select_one("span[data-auid='productPrice'], div[data-auid='productPrice'], .css-1hg2i0a, [class*='Price']")
        if pe: price = self._clean(pe.text)
        
        images = []
        for img in soup.find_all('img'):
            src = img.get('src')
            if src and ('product' in src.lower() or 'academy' in src.lower()) and 'icon' not in src.lower():
                images.append(self._normalize_url(src))
        
        desc_meta = soup.find('meta', property='og:description')
        description = self._clean(desc_meta.get('content') if desc_meta else "")
        
        attrs = {}
        # Academy specific selector for specifications
        spec_container = soup.select_one("div[data-auid='productSpecifications'], #collapsible-details")
        if spec_container:
            for li in spec_container.find_all('li'):
                if ':' in li.text:
                    parts = li.text.split(':', 1)
                    attrs[self._clean(parts[0])] = self._clean(parts[1])

        return {
            'nombre': title, 'precio': price, 'url': url, 'sitio': 'Academy',
            'imagenes': images, 'atributos': attrs, 'vendedor': 'Academy',
            'descripcion': description, 'fecha': datetime.now().strftime('%Y-%m-%d %H:%M:%S')
        }

class MercadoLibreScraper(BaseScraper):
    def extraer(self, url):
        self.driver.get(url)
        time.sleep(3)
        soup = BeautifulSoup(self.driver.page_source, 'html.parser')
        
        title = self._clean(soup.find('h1', class_='ui-pdp-title').text) if soup.find('h1', class_='ui-pdp-title') else "N/A"
        
        price = "N/A"
        pm = soup.find('meta', {'itemprop': 'price'})
        if pm: price = pm.get('content')
        
        images = [self._normalize_url(img.get('src') or img.get('data-src')) for img in soup.select('.ui-pdp-gallery__figure img') if (img.get('src') or img.get('data-src'))]
        
        attrs = {}
        for row in soup.select('.andes-table tr'):
            th, td = row.find('th'), row.find('td')
            if th and td: attrs[self._clean(th.text)] = self._clean(td.text)
            
        desc_div = soup.find('p', class_='ui-pdp-description__content')
        description = self._clean(desc_div.text) if desc_div else "N/A"
        
        vendor = "MercadoLibre"
        sl = soup.find('a', class_='ui-pdp-seller__link-trigger')
        if sl: vendor = self._clean(sl.text)

        return {
            'nombre': title, 'precio': price, 'url': url, 'sitio': 'MercadoLibre',
            'imagenes': images, 'atributos': attrs, 'vendedor': vendor,
            'descripcion': description, 'fecha': datetime.now().strftime('%Y-%m-%d %H:%M:%S')
        }

# ==============================
# ORQUESTADOR
# ==============================

class WebScraperOrchestrator:
    def ejecutar(self, urls: Dict[str, str]):
        driver_mgr = SeleniumDriver()
        driver = driver_mgr.inicializar()
        sheets = GoogleSheetsManager()
        
        scrapers = {
            'amazon': AmazonScraper(driver),
            'ebay': EbayScraper(driver),
            'academy': AcademyScraper(driver),
            'mercadolibre': MercadoLibreScraper(driver)
        }
        
        results = []
        for key, url in urls.items():
            if key in scrapers:
                try:
                    logger.info(f"Procesando {key}...")
                    p = scrapers[key].extraer(url)
                    results.append(p)
                except Exception as e:
                    logger.error(f"Error {key}: {e}")
        
        driver.quit()
        if results: self._save_to_sheets(results, sheets)
        return results

    def _save_to_sheets(self, products, sheets):
        rows = []
        for p in products:
            domain = urlparse(p['url']).netloc.replace('www.', '')
            currency = 'MXN' if 'mercadolibre' in domain or '.mx' in domain else 'USD'
            
            # Limpieza de precio mejorada: toma el primer bloque numérico
            price_raw = str(p.get('precio', ''))
            price_match = re.search(r'(\d+[\d\.,]*)', price_raw)
            price_clean = price_match.group(1).replace(',', '') if price_match else ""
            
            attrs = p['atributos']
            st = BaseScraper(None)
            
            brand = st.get_attr_case_insensitive(attrs, ['Brand', 'Marca', 'Fabricante', 'Manufacturer'])
            model = st.get_attr_case_insensitive(attrs, ['Model', 'Modelo', 'Número de parte', 'MPN', 'Mfr Part Number'])
            mpn = st.get_attr_case_insensitive(attrs, ['MPN', 'Número de parte', 'Part Number', 'Mfr Part Number'])
            color = st.get_attr_case_insensitive(attrs, ['Color', 'Colour'])
            size = st.get_attr_case_insensitive(attrs, ['Size', 'Talla'])
            condition = st.get_attr_case_insensitive(attrs, ['Condition', 'Condición', 'Estado'])

            row = [
                p['url'], p['nombre'], p['descripcion'][:5000], price_clean, currency,
                p['imagenes'][0] if p['imagenes'] else '', model, mpn, 'N/A', 'N/A', 'N/A',
                color, size, condition, 'N/A', 'N/A', 'N/A', 'N/A', 'N/A', 'N/A', 'N/A',
                price_clean if currency == 'USD' else 'N/A', price_clean if currency == 'MXN' else 'N/A',
                p['vendedor'], p['sitio'], p['url'], json.dumps(p['imagenes']), json.dumps(attrs),
                p['descripcion'][:5000], domain, 'Pending', brand, model, p['url'],
                p['imagenes'][0] if p['imagenes'] else '', 'N/A', 'N/A', 'Disponible', p['fecha']
            ]
            rows.append(row)
        sheets.guardar_datos(rows)

def main():
    urls = {
        'amazon': 'https://www.amazon.com/dp/B00P5CEJ46',
        'academy': 'https://www.academy.com/p/magellan-outdoors-camo-day-pack',
        'ebay': 'https://www.ebay.com/itm/136817975878?var=435369828258',
        'mercadolibre': 'https://www.mercadolibre.com.mx/colimador-alineador-o-regimador-flecha-arco-ballesta-mira/up/MLMU3460266580?gallery_type=horizontal&sizeForPhoto=416&pdp_filters=official_store%3A150784'
    }
    orchestrator = WebScraperOrchestrator()
    orchestrator.ejecutar(urls)

if __name__ == "__main__":
    main()
