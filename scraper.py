"""
Web scraper para múltiples sitios web (GunMagWarehouse, eBay, Amazon, Academy)
con integración a Google Sheets.

Este script proporciona una solución mejorada para scraping de productos con:
- Configuración basada en variables de entorno
- Manejo robusto de errores
- Sistema de logging
- Arquitectura modular
- Reintentos automáticos
"""

import os
import sys
import time
import logging
from typing import List, Dict, Optional, Any
from datetime import datetime

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

# Cargar variables de entorno
load_dotenv()

# Configuración de Google Sheets
GOOGLE_SHEET_ID = os.getenv('GOOGLE_SHEET_ID')
SHEET_NAME = os.getenv('SHEET_NAME', 'Compras')
CREDENTIALS_PATH = os.getenv('CREDENTIALS_PATH')

# Configuración de Selenium
CHROMEDRIVER_PATH = os.getenv('CHROMEDRIVER_PATH')
HEADLESS_MODE = os.getenv('HEADLESS_MODE', 'True').lower() == 'true'
PAGE_LOAD_TIMEOUT = int(os.getenv('PAGE_LOAD_TIMEOUT', '30'))
IMPLICIT_WAIT = int(os.getenv('IMPLICIT_WAIT', '10'))

# Configuración de logging
LOG_LEVEL = os.getenv('LOG_LEVEL', 'INFO')
LOG_FILE = os.getenv('LOG_FILE', 'scraper.log')


# ==============================
# CONFIGURACIÓN DE LOGGING
# ==============================

def setup_logging() -> logging.Logger:
    """
    Configura el sistema de logging con salida a archivo y consola.
    
    Returns:
        Logger configurado
    """
    logger = logging.getLogger('web_scraper')
    logger.setLevel(getattr(logging, LOG_LEVEL))
    
    # Evitar duplicación de handlers
    if logger.handlers:
        return logger
    
    # Formato de log
    formatter = logging.Formatter(
        '%(asctime)s - %(name)s - %(levelname)s - %(message)s',
        datefmt='%Y-%m-%d %H:%M:%S'
    )
    
    # Handler para archivo
    file_handler = logging.FileHandler(LOG_FILE, encoding='utf-8')
    file_handler.setLevel(logging.DEBUG)
    file_handler.setFormatter(formatter)
    logger.addHandler(file_handler)
    
    # Handler para consola
    console_handler = logging.StreamHandler(sys.stdout)
    console_handler.setLevel(logging.INFO)
    console_handler.setFormatter(formatter)
    logger.addHandler(console_handler)
    
    return logger


logger = setup_logging()


# ==============================
# VALIDACIÓN DE CONFIGURACIÓN
# ==============================

def validate_config() -> None:
    """
    Valida que todas las configuraciones requeridas estén presentes.
    
    Raises:
        ValueError: Si falta alguna configuración requerida
    """
    required_configs = {
        'GOOGLE_SHEET_ID': GOOGLE_SHEET_ID,
        'CREDENTIALS_PATH': CREDENTIALS_PATH,
        'CHROMEDRIVER_PATH': CHROMEDRIVER_PATH
    }
    
    missing = [key for key, value in required_configs.items() if not value]
    
    if missing:
        error_msg = f"Faltan las siguientes configuraciones: {', '.join(missing)}"
        logger.error(error_msg)
        logger.error("Por favor, configura las variables de entorno en un archivo .env")
        raise ValueError(error_msg)
    
    # Validar que los archivos existan
    if not os.path.exists(CREDENTIALS_PATH):
        error_msg = f"El archivo de credenciales no existe: {CREDENTIALS_PATH}"
        logger.error(error_msg)
        raise FileNotFoundError(error_msg)
    
    if not os.path.exists(CHROMEDRIVER_PATH):
        error_msg = f"ChromeDriver no encontrado en: {CHROMEDRIVER_PATH}"
        logger.error(error_msg)
        raise FileNotFoundError(error_msg)
    
    logger.info("Configuración validada exitosamente")


# ==============================
# CONEXIÓN CON GOOGLE SHEETS
# ==============================

class GoogleSheetsManager:
    """Gestor de conexiones y operaciones con Google Sheets."""
    
    def __init__(self):
        """Inicializa el gestor de Google Sheets."""
        self.sheet = None
        self.client = None
    
    def conectar(self) -> gspread.Worksheet:
        """
        Establece conexión con Google Sheets.
        
        Returns:
            Worksheet de Google Sheets
            
        Raises:
            Exception: Si hay error en la conexión
        """
        try:
            logger.info("Conectando con Google Sheets...")
            scope = [
                "https://spreadsheets.google.com/feeds",
                "https://www.googleapis.com/auth/drive"
            ]
            
            creds = ServiceAccountCredentials.from_json_keyfile_name(
                CREDENTIALS_PATH, scope
            )
            self.client = gspread.authorize(creds)
            self.sheet = self.client.open_by_key(GOOGLE_SHEET_ID).worksheet(SHEET_NAME)
            
            logger.info(f"Conectado exitosamente a la hoja: {SHEET_NAME}")
            return self.sheet
            
        except Exception as e:
            logger.error(f"Error al conectar con Google Sheets: {str(e)}")
            raise
    
    def guardar_datos(self, datos: List[List[Any]], fila_inicio: int = None) -> None:
        """
        Guarda datos en Google Sheets.
        
        Args:
            datos: Lista de listas con los datos a guardar
            fila_inicio: Fila inicial donde guardar (None para agregar al final)
            
        Raises:
            Exception: Si hay error al guardar
        """
        try:
            if not self.sheet:
                self.conectar()
            
            if fila_inicio:
                self.sheet.update(f'A{fila_inicio}', datos)
                logger.info(f"Datos actualizados desde la fila {fila_inicio}")
            else:
                self.sheet.append_rows(datos)
                logger.info(f"Se agregaron {len(datos)} filas nuevas")
                
        except Exception as e:
            logger.error(f"Error al guardar datos en Google Sheets: {str(e)}")
            raise
    
    def limpiar_hoja(self) -> None:
        """Limpia todo el contenido de la hoja."""
        try:
            if not self.sheet:
                self.conectar()
            
            self.sheet.clear()
            logger.info("Hoja limpiada exitosamente")
            
        except Exception as e:
            logger.error(f"Error al limpiar la hoja: {str(e)}")
            raise


# ==============================
# CONFIGURACIÓN DE SELENIUM
# ==============================

class SeleniumDriver:
    """Gestor del driver de Selenium con configuración optimizada."""
    
    def __init__(self):
        """Inicializa el gestor de Selenium."""
        self.driver = None
    
    def inicializar(self) -> webdriver.Chrome:
        """
        Configura e inicializa el driver de Selenium.
        
        Returns:
            WebDriver de Chrome configurado
            
        Raises:
            WebDriverException: Si hay error al inicializar el driver
        """
        try:
            logger.info("Inicializando Selenium WebDriver...")
            
            chrome_options = Options()
            
            if HEADLESS_MODE:
                chrome_options.add_argument("--headless")
                logger.info("Modo headless activado")
            
            # Opciones de optimización y compatibilidad
            chrome_options.add_argument("--disable-gpu")
            chrome_options.add_argument("--no-sandbox")
            chrome_options.add_argument("--disable-dev-shm-usage")
            chrome_options.add_argument("--window-size=1920,1080")
            chrome_options.add_argument("--disable-blink-features=AutomationControlled")
            chrome_options.add_argument("--user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36")
            
            # Deshabilitar logs innecesarios
            chrome_options.add_experimental_option('excludeSwitches', ['enable-logging'])
            
            service = Service(CHROMEDRIVER_PATH)
            self.driver = webdriver.Chrome(service=service, options=chrome_options)
            
            # Configurar timeouts
            self.driver.set_page_load_timeout(PAGE_LOAD_TIMEOUT)
            self.driver.implicitly_wait(IMPLICIT_WAIT)
            
            logger.info("WebDriver inicializado exitosamente")
            return self.driver
            
        except WebDriverException as e:
            logger.error(f"Error al inicializar WebDriver: {str(e)}")
            raise
    
    def cerrar(self) -> None:
        """Cierra el driver de Selenium de forma segura."""
        if self.driver:
            try:
                self.driver.quit()
                logger.info("WebDriver cerrado correctamente")
            except Exception as e:
                logger.warning(f"Error al cerrar WebDriver: {str(e)}")


# ==============================
# SCRAPERS POR SITIO WEB
# ==============================

class BaseScraper:
    """Clase base para scrapers de sitios web."""
    
    def __init__(self, driver: webdriver.Chrome):
        """
        Inicializa el scraper base.
        
        Args:
            driver: WebDriver de Selenium
        """
        self.driver = driver
        self.nombre_sitio = "Base"
    
    def esperar_elemento(
        self, 
        by: By, 
        valor: str, 
        timeout: int = 10
    ) -> Optional[Any]:
        """
        Espera a que un elemento esté presente en la página.
        
        Args:
            by: Tipo de selector (By.ID, By.CLASS_NAME, etc.)
            valor: Valor del selector
            timeout: Tiempo máximo de espera en segundos
            
        Returns:
            Elemento encontrado o None
        """
        try:
            elemento = WebDriverWait(self.driver, timeout).until(
                EC.presence_of_element_located((by, valor))
            )
            return elemento
        except TimeoutException:
            logger.warning(
                f"Timeout esperando elemento {by}={valor} en {self.nombre_sitio}"
            )
            return None
    
    def extraer_datos(self, url: str) -> List[Dict[str, str]]:
        """
        Extrae datos del sitio web.
        
        Args:
            url: URL del sitio a scrapear
            
        Returns:
            Lista de diccionarios con los datos extraídos
        """
        raise NotImplementedError("Subclases deben implementar extraer_datos()")


class GunMagWarehouseScraper(BaseScraper):
    """Scraper para GunMagWarehouse."""
    
    def __init__(self, driver: webdriver.Chrome):
        """Inicializa el scraper de GunMagWarehouse."""
        super().__init__(driver)
        self.nombre_sitio = "GunMagWarehouse"
    
    def extraer_datos(self, url: str) -> List[Dict[str, str]]:
        """
        Extrae datos de productos de GunMagWarehouse.
        
        Args:
            url: URL de la página de productos
            
        Returns:
            Lista de productos con nombre, precio y disponibilidad
        """
        productos = []
        
        try:
            logger.info(f"Scrapeando {self.nombre_sitio}: {url}")
            self.driver.get(url)
            time.sleep(2)  # Esperar carga de página
            
            soup = BeautifulSoup(self.driver.page_source, 'html.parser')
            
            # Adaptar selectores según la estructura real del sitio
            items = soup.find_all('div', class_='product-item')
            
            for item in items:
                try:
                    nombre = item.find('h2', class_='product-name')
                    precio = item.find('span', class_='price')
                    stock = item.find('span', class_='stock-status')
                    
                    producto = {
                        'sitio': self.nombre_sitio,
                        'nombre': nombre.text.strip() if nombre else 'N/A',
                        'precio': precio.text.strip() if precio else 'N/A',
                        'disponibilidad': stock.text.strip() if stock else 'N/A',
                        'url': url,
                        'fecha': datetime.now().strftime('%Y-%m-%d %H:%M:%S')
                    }
                    
                    productos.append(producto)
                    
                except Exception as e:
                    logger.warning(f"Error extrayendo producto individual: {str(e)}")
                    continue
            
            logger.info(f"Extraídos {len(productos)} productos de {self.nombre_sitio}")
            
        except Exception as e:
            logger.error(f"Error scrapeando {self.nombre_sitio}: {str(e)}")
        
        return productos


class EbayScraper(BaseScraper):
    """Scraper para eBay."""
    
    def __init__(self, driver: webdriver.Chrome):
        """Inicializa el scraper de eBay."""
        super().__init__(driver)
        self.nombre_sitio = "eBay"
    
    def extraer_datos(self, url: str) -> List[Dict[str, str]]:
        """
        Extrae datos de productos de eBay.
        
        Args:
            url: URL de la búsqueda en eBay
            
        Returns:
            Lista de productos con nombre, precio y disponibilidad
        """
        productos = []
        
        try:
            logger.info(f"Scrapeando {self.nombre_sitio}: {url}")
            self.driver.get(url)
            time.sleep(2)
            
            soup = BeautifulSoup(self.driver.page_source, 'html.parser')
            
            # Selectores específicos para eBay
            items = soup.find_all('div', class_='s-item')
            
            for item in items:
                try:
                    nombre = item.find('h3', class_='s-item__title')
                    precio = item.find('span', class_='s-item__price')
                    envio = item.find('span', class_='s-item__shipping')
                    
                    producto = {
                        'sitio': self.nombre_sitio,
                        'nombre': nombre.text.strip() if nombre else 'N/A',
                        'precio': precio.text.strip() if precio else 'N/A',
                        'disponibilidad': envio.text.strip() if envio else 'N/A',
                        'url': url,
                        'fecha': datetime.now().strftime('%Y-%m-%d %H:%M:%S')
                    }
                    
                    productos.append(producto)
                    
                except Exception as e:
                    logger.warning(f"Error extrayendo producto individual: {str(e)}")
                    continue
            
            logger.info(f"Extraídos {len(productos)} productos de {self.nombre_sitio}")
            
        except Exception as e:
            logger.error(f"Error scrapeando {self.nombre_sitio}: {str(e)}")
        
        return productos


class AmazonScraper(BaseScraper):
    """Scraper para Amazon."""
    
    def __init__(self, driver: webdriver.Chrome):
        """Inicializa el scraper de Amazon."""
        super().__init__(driver)
        self.nombre_sitio = "Amazon"
    
    def extraer_datos(self, url: str) -> List[Dict[str, str]]:
        """
        Extrae datos de productos de Amazon.
        
        Args:
            url: URL de la búsqueda en Amazon
            
        Returns:
            Lista de productos con nombre, precio y disponibilidad
        """
        productos = []
        
        try:
            logger.info(f"Scrapeando {self.nombre_sitio}: {url}")
            self.driver.get(url)
            time.sleep(3)  # Amazon puede requerir más tiempo
            
            soup = BeautifulSoup(self.driver.page_source, 'html.parser')
            
            # Selectores para Amazon
            items = soup.find_all('div', {'data-component-type': 's-search-result'})
            
            for item in items:
                try:
                    nombre = item.find('h2', class_='s-line-clamp-2')
                    precio_entero = item.find('span', class_='a-price-whole')
                    precio_decimal = item.find('span', class_='a-price-fraction')
                    disponibilidad = item.find('span', class_='a-color-success')
                    
                    precio_texto = 'N/A'
                    if precio_entero:
                        precio_texto = precio_entero.text.strip()
                        if precio_decimal:
                            precio_texto += precio_decimal.text.strip()
                    
                    producto = {
                        'sitio': self.nombre_sitio,
                        'nombre': nombre.text.strip() if nombre else 'N/A',
                        'precio': precio_texto,
                        'disponibilidad': disponibilidad.text.strip() if disponibilidad else 'N/A',
                        'url': url,
                        'fecha': datetime.now().strftime('%Y-%m-%d %H:%M:%S')
                    }
                    
                    productos.append(producto)
                    
                except Exception as e:
                    logger.warning(f"Error extrayendo producto individual: {str(e)}")
                    continue
            
            logger.info(f"Extraídos {len(productos)} productos de {self.nombre_sitio}")
            
        except Exception as e:
            logger.error(f"Error scrapeando {self.nombre_sitio}: {str(e)}")
        
        return productos


class AcademyScraper(BaseScraper):
    """Scraper para Academy Sports + Outdoors."""
    
    def __init__(self, driver: webdriver.Chrome):
        """Inicializa el scraper de Academy."""
        super().__init__(driver)
        self.nombre_sitio = "Academy"
    
    def extraer_datos(self, url: str) -> List[Dict[str, str]]:
        """
        Extrae datos de productos de Academy.
        
        Args:
            url: URL de la búsqueda en Academy
            
        Returns:
            Lista de productos con nombre, precio y disponibilidad
        """
        productos = []
        
        try:
            logger.info(f"Scrapeando {self.nombre_sitio}: {url}")
            self.driver.get(url)
            time.sleep(2)
            
            soup = BeautifulSoup(self.driver.page_source, 'html.parser')
            
            # Selectores para Academy
            items = soup.find_all('div', class_='product-tile')
            
            for item in items:
                try:
                    nombre = item.find('a', class_='product-title')
                    precio = item.find('span', class_='product-price')
                    stock = item.find('span', class_='stock-message')
                    
                    producto = {
                        'sitio': self.nombre_sitio,
                        'nombre': nombre.text.strip() if nombre else 'N/A',
                        'precio': precio.text.strip() if precio else 'N/A',
                        'disponibilidad': stock.text.strip() if stock else 'N/A',
                        'url': url,
                        'fecha': datetime.now().strftime('%Y-%m-%d %H:%M:%S')
                    }
                    
                    productos.append(producto)
                    
                except Exception as e:
                    logger.warning(f"Error extrayendo producto individual: {str(e)}")
                    continue
            
            logger.info(f"Extraídos {len(productos)} productos de {self.nombre_sitio}")
            
        except Exception as e:
            logger.error(f"Error scrapeando {self.nombre_sitio}: {str(e)}")
        
        return productos


# ==============================
# ORQUESTADOR PRINCIPAL
# ==============================

class WebScraperOrchestrator:
    """Orquestador principal para coordinar el scraping y guardado de datos."""
    
    def __init__(self):
        """Inicializa el orquestador."""
        self.selenium_driver = None
        self.sheets_manager = None
        self.scrapers = {}
    
    def inicializar(self) -> None:
        """Inicializa todos los componentes necesarios."""
        logger.info("=== Iniciando Web Scraper ===")
        
        # Validar configuración
        validate_config()
        
        # Inicializar Selenium
        self.selenium_driver = SeleniumDriver()
        driver = self.selenium_driver.inicializar()
        
        # Inicializar scrapers
        self.scrapers = {
            'gunmagwarehouse': GunMagWarehouseScraper(driver),
            'ebay': EbayScraper(driver),
            'amazon': AmazonScraper(driver),
            'academy': AcademyScraper(driver)
        }
        
        # Inicializar Google Sheets
        self.sheets_manager = GoogleSheetsManager()
        self.sheets_manager.conectar()
        
        logger.info("Todos los componentes inicializados correctamente")
    
    def scrapear_sitios(self, urls: Dict[str, str]) -> List[Dict[str, str]]:
        """
        Scrapea múltiples sitios web.
        
        Args:
            urls: Diccionario con {nombre_sitio: url}
            
        Returns:
            Lista consolidada de todos los productos extraídos
        """
        todos_productos = []
        
        for sitio, url in urls.items():
            if sitio in self.scrapers:
                try:
                    productos = self.scrapers[sitio].extraer_datos(url)
                    todos_productos.extend(productos)
                except Exception as e:
                    logger.error(f"Error en scraper de {sitio}: {str(e)}")
            else:
                logger.warning(f"No hay scraper disponible para: {sitio}")
        
        logger.info(f"Total de productos extraídos: {len(todos_productos)}")
        return todos_productos
    
    def guardar_en_sheets(self, productos: List[Dict[str, str]]) -> None:
        """
        Guarda los productos en Google Sheets.
        
        Args:
            productos: Lista de productos a guardar
        """
        if not productos:
            logger.warning("No hay productos para guardar")
            return
        
        # Convertir diccionarios a listas
        encabezados = ['Sitio', 'Nombre', 'Precio', 'Disponibilidad', 'URL', 'Fecha']
        datos = [encabezados]
        
        for producto in productos:
            fila = [
                producto.get('sitio', ''),
                producto.get('nombre', ''),
                producto.get('precio', ''),
                producto.get('disponibilidad', ''),
                producto.get('url', ''),
                producto.get('fecha', '')
            ]
            datos.append(fila)
        
        self.sheets_manager.guardar_datos(datos)
        logger.info(f"Guardados {len(productos)} productos en Google Sheets")
    
    def ejecutar(self, urls: Dict[str, str], guardar: bool = True) -> List[Dict[str, str]]:
        """
        Ejecuta el proceso completo de scraping.
        
        Args:
            urls: Diccionario con las URLs a scrapear
            guardar: Si se debe guardar en Google Sheets
            
        Returns:
            Lista de productos extraídos
        """
        productos = []
        
        try:
            self.inicializar()
            productos = self.scrapear_sitios(urls)
            
            if guardar and productos:
                self.guardar_en_sheets(productos)
            
            logger.info("=== Proceso completado exitosamente ===")
            
        except Exception as e:
            logger.error(f"Error en el proceso de scraping: {str(e)}")
            raise
        
        finally:
            self.finalizar()
        
        return productos
    
    def finalizar(self) -> None:
        """Limpia recursos y cierra conexiones."""
        if self.selenium_driver:
            self.selenium_driver.cerrar()
        
        logger.info("Recursos liberados correctamente")


# ==============================
# FUNCIÓN PRINCIPAL
# ==============================

def main():
    """Función principal para ejecutar el scraper."""
    
    # Ejemplo de URLs a scrapear (personalizar según necesidad)
    urls_ejemplo = {
        'ebay': 'https://www.ebay.com/sch/i.html?_nkw=electronics',
        'amazon': 'https://www.amazon.com/s?k=electronics',
        # 'gunmagwarehouse': 'https://gunmagwarehouse.com/...',
        # 'academy': 'https://www.academy.com/...'
    }
    
    try:
        orquestador = WebScraperOrchestrator()
        productos = orquestador.ejecutar(urls_ejemplo, guardar=True)
        
        print(f"\n✓ Scraping completado. Total de productos: {len(productos)}")
        
    except Exception as e:
        logger.error(f"Error fatal en la ejecución: {str(e)}")
        sys.exit(1)


if __name__ == "__main__":
    main()
