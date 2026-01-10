import time
from selenium import webdriver
from selenium.webdriver.chrome.service import Service
from selenium.webdriver.chrome.options import Options
from bs4 import BeautifulSoup
import gspread
from oauth2client.service_account import ServiceAccountCredentials

# Configuración Selenium
chrome_options = Options()
chrome_options.add_argument("--headless")  # Ejecutar sin abrir ventana
service = Service("chromedriver.exe")  # Ruta al chromedriver
driver = webdriver.Chrome(service=service, options=chrome_options)

# Conexión con Google Sheets
scope = ["https://spreadsheets.google.com/feeds", "https://www.googleapis.com/auth/drive"]
creds = ServiceAccountCredentials.from_json_keyfile_name("credenciales.json", scope)
client = gspread.authorize(creds)

# Abrir hoja y leer URL desde celda H3
sheet = client.open_by_key("1bWSMhd-cFsR_0iYiiRHkr-zKU7vbqLvW-c5k-5Fxgo0").worksheet("Compras")
url = sheet.acell("H3").value

print(f"Scrapeando URL: {url}")

# Cargar página con Selenium
driver.get(url)
time.sleep(5)  # Esperar a que cargue el contenido dinámico
html = driver.page_source
driver.quit()

# Parsear HTML con BeautifulSoup
soup = BeautifulSoup(html, "html.parser")

# Extraer datos (ajustamos selectores reales del sitio)
nombre_tag = soup.find("h1", {"itemprop": "name"})
nombre = nombre_tag.get_text(strip=True) if nombre_tag else "Nombre no encontrado"

precio_tag = soup.find("span", {"class": "price"})
precio = precio_tag.get_text(strip=True) if precio_tag else "Precio no encontrado"

descripcion_tag = soup.find("div", {"itemprop": "description"})
descripcion = descripcion_tag.get_text(strip=True) if descripcion_tag else "Sin descripción"

imagen_tag = soup.find("img", {"class": "product-image-photo"})
imagen_url = imagen_tag["src"] if imagen_tag else "Sin imagen"

# Insertar encabezados si está vacío
if not sheet.get_all_values():
    sheet.append_row(["Nombre", "Precio", "Descripción", "Imagen URL", "Link"])

# Insertar datos en la hoja
sheet.append_row([nombre, precio, descripcion, imagen_url, url])

print("✅ Datos guardados en Google Sheets correctamente.")
