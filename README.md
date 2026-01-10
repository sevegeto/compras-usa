# Compras USA - Web Scraper

Sistema automatizado de web scraping que lee URLs desde Google Sheets y extrae información de productos de múltiples sitios web.

## 🚀 Características

✅ **Lee URLs desde Google Sheets** - Columna H (a partir de H3) en la hoja "Compras"  
✅ **Detección automática de dominio** - Soporta GunMagWarehouse, eBay, Amazon, Academy  
✅ **Selenium para contenido dinámico** - Carga JavaScript y contenido asíncrono  
✅ **Extracción completa de datos** - Nombre, Precio, Descripción, Imagen, Link  
✅ **Escritura automática a Sheets** - Inserta los datos extraídos en Google Sheets  
✅ **Fácilmente extensible** - Estructura modular para añadir nuevos sitios

## 📋 Requisitos

- Python 3.8 o superior
- Google Chrome/Chromium instalado
- Cuenta de Google Cloud con Google Sheets API habilitada

## 🔧 Instalación

1. **Clonar el repositorio**
```bash
git clone https://github.com/sevegeto/compras-usa.git
cd compras-usa
```

2. **Instalar dependencias**
```bash
pip install -r requirements.txt
```

3. **Configurar Google Sheets API**

   a. Ve a [Google Cloud Console](https://console.cloud.google.com/)
   
   b. Crea un nuevo proyecto o selecciona uno existente
   
   c. Habilita la API de Google Sheets:
      - Ve a "APIs & Services" > "Library"
      - Busca "Google Sheets API"
      - Haz clic en "Enable"
   
   d. Crea credenciales OAuth 2.0:
      - Ve a "APIs & Services" > "Credentials"
      - Clic en "Create Credentials" > "OAuth client ID"
      - Selecciona "Desktop app" como tipo de aplicación
      - Descarga el archivo JSON
   
   e. Renombra el archivo descargado a `credentials.json` y colócalo en el directorio raíz del proyecto

## 📖 Uso

### Uso Básico

```bash
python main.py YOUR_SPREADSHEET_ID
```

Donde `YOUR_SPREADSHEET_ID` es el ID de tu hoja de Google Sheets (se encuentra en la URL de la hoja).

### Opciones Avanzadas

```bash
python main.py YOUR_SPREADSHEET_ID \
  --sheet "Compras" \
  --column "H" \
  --start-row 3 \
  --headless
```

**Parámetros:**
- `spreadsheet_id` (requerido): ID de la hoja de Google Sheets
- `--sheet`: Nombre de la hoja (default: "Compras")
- `--column`: Columna que contiene las URLs (default: "H")
- `--start-row`: Fila inicial (default: 3)
- `--headless`: Ejecutar el navegador en modo headless (default: True)

### Primera Ejecución

En la primera ejecución, se abrirá una ventana del navegador para autenticar tu cuenta de Google. El token se guardará en `token.json` para ejecuciones futuras.

## 📊 Estructura de Google Sheets

El script espera la siguiente estructura:

**Entrada (Columna H):**
- URLs de productos (una por fila, empezando en H3)

**Salida (Columnas A-E):**
- **Columna A:** Nombre del producto
- **Columna B:** Precio
- **Columna C:** Descripción
- **Columna D:** URL de la imagen
- **Columna E:** Link del producto

## 🌐 Sitios Soportados

- **GunMagWarehouse** (gunmagwarehouse.com)
- **eBay** (ebay.com)
- **Amazon** (amazon.com)
- **Academy Sports + Outdoors** (academy.com)

## 🔌 Añadir Nuevos Sitios

Para añadir soporte para un nuevo sitio web:

1. **Crear un nuevo scraper en `scrapers.py`:**

```python
class NuevoSitioScraper(BaseScraper):
    """Scraper para NuevoSitio.com"""
    
    def _scrape_product(self, url):
        self.driver.get(url)
        time.sleep(2)
        
        soup = self._get_soup()
        
        # Extraer datos usando selectores CSS específicos del sitio
        name = soup.select_one('.product-title').get_text()
        price = soup.select_one('.price').get_text()
        # ... más extracciones
        
        return {
            'name': self._clean_text(name),
            'price': self._clean_price(price),
            'description': description,
            'image': image,
            'link': url
        }
```

2. **Añadir el dominio a `domain_detector.py`:**

```python
DOMAIN_MAPPING = {
    # ... dominios existentes
    'nuevositio.com': 'nuevositio',
}

# Y en get_scraper_class():
scraper_map = {
    # ... scrapers existentes
    'nuevositio': NuevoSitioScraper,
}
```

## 📁 Estructura del Proyecto

```
compras-usa/
├── main.py              # Script principal
├── scrapers.py          # Scrapers específicos por sitio
├── domain_detector.py   # Detección automática de dominios
├── sheets_client.py     # Cliente de Google Sheets API
├── requirements.txt     # Dependencias de Python
├── credentials.json     # Credenciales de Google (no incluido)
├── token.json          # Token de autenticación (generado)
└── README.md           # Este archivo
```

## 🛠️ Desarrollo

### Ejecutar en modo no-headless (ver el navegador)

```bash
python main.py YOUR_SPREADSHEET_ID --no-headless
```

### Depuración

El script imprime información detallada durante la ejecución:
- URLs encontradas
- Dominio detectado
- Datos extraídos
- Errores encontrados

## ⚠️ Notas Importantes

1. **Rate Limiting:** Algunos sitios pueden bloquear requests frecuentes. Usa el script con moderación.

2. **Estructura de sitios web:** Los selectores CSS pueden cambiar cuando los sitios actualizan su diseño. Actualiza los scrapers según sea necesario.

3. **Credenciales:** Nunca compartas tus archivos `credentials.json` o `token.json`.

4. **Términos de servicio:** Asegúrate de cumplir con los términos de servicio de los sitios web que estás scrapeando.

## 🤝 Contribuciones

Las contribuciones son bienvenidas. Para añadir soporte para nuevos sitios o mejorar los scrapers existentes, por favor:

1. Fork el repositorio
2. Crea una rama para tu feature (`git checkout -b feature/nuevo-sitio`)
3. Commit tus cambios (`git commit -am 'Añadir soporte para NuevoSitio'`)
4. Push a la rama (`git push origin feature/nuevo-sitio`)
5. Crea un Pull Request

## 📝 Licencia

Este proyecto es de código abierto y está disponible bajo la licencia MIT.

## 📧 Contacto

Para preguntas o soporte, por favor abre un issue en GitHub.
