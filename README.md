# Compras USA - Web Scraper + MercadoLibre Integration

Script avanzado para scrapear múltiples sitios web de compras (GunMagWarehouse, eBay, Amazon, Academy) y guardar automáticamente los datos en Google Sheets. Incluye integración completa con la API de notificaciones de MercadoLibre.

## 🚀 Características

### Web Scraping
- ✅ **Scraping de múltiples sitios**: Soporta GunMagWarehouse, eBay, Amazon y Academy
- ✅ **Integración con Google Sheets**: Guarda automáticamente los productos extraídos
- ✅ **Configuración mediante variables de entorno**: Sin rutas hardcodeadas
- ✅ **Sistema de logging robusto**: Registro detallado en archivo y consola
- ✅ **Arquitectura modular**: Fácil de extender con nuevos scrapers
- ✅ **Manejo de errores**: Reintentos automáticos y manejo graceful de fallos
- ✅ **Modo headless**: Ejecuta sin interfaz gráfica para mayor eficiencia
- ✅ **Type hints**: Código documentado con tipos para mejor mantenibilidad

### MercadoLibre Integration (NEW! 🎉)
- ✅ **Webhook real-time**: Respuesta HTTP 200 en <500ms (cumple requisitos de ML)
- ✅ **Procesamiento asíncrono**: Cola de notificaciones con triggers automáticos
- ✅ **6+ tipos de notificaciones**: Items, Orders, Questions, Payments, Messages, Shipments
- ✅ **Logging automático**: Cada notificación se registra en Google Sheets
- ✅ **Auditoría de inventario**: Detecta cambios phantom en stock
- ✅ **Tracking de ventas**: Monitoreo completo del ciclo de venta
- ✅ **Suite de pruebas**: Tests comprehensivos para todos los tipos de notificaciones

## 📚 Documentation

### MercadoLibre Webhook Setup
- **[WEBHOOK_SETUP.md](WEBHOOK_SETUP.md)** - Complete setup guide, troubleshooting, and best practices
- **[WEBHOOK_API_REFERENCE.md](WEBHOOK_API_REFERENCE.md)** - API reference, functions, and quick examples

### Main Files
- **main.js** - MercadoLibre webhook handler and notification processing
- **Test.js** - Comprehensive test suite for webhooks
- **tokenz.js** - Authentication and token management
- **scraper.py** - Web scraping orchestrator

## 📋 Requisitos

### Software Necesario

- **Python 3.8+**
- **Google Chrome** (instalado en el sistema)
- **ChromeDriver** compatible con tu versión de Chrome
- **Cuenta de servicio de Google** con acceso a Google Sheets API

### Dependencias de Python

Las dependencias se instalan automáticamente desde `requirements.txt`:

```
selenium>=4.0.0
beautifulsoup4>=4.11.0
gspread>=5.7.0
oauth2client>=4.1.3
python-dotenv>=1.0.0
```

## 🔧 Instalación

### 1. Clonar el Repositorio

```bash
git clone https://github.com/sevegeto/compras-usa.git
cd compras-usa
```

### 2. Crear Entorno Virtual (Recomendado)

```bash
python -m venv venv

# Windows
venv\Scripts\activate

# Linux/Mac
source venv/bin/activate
```

### 3. Instalar Dependencias

```bash
pip install -r requirements.txt
```

### 4. Descargar ChromeDriver

1. Verifica tu versión de Chrome: `chrome://version/`
2. Descarga ChromeDriver compatible desde: https://chromedriver.chromium.org/downloads
3. Coloca el ejecutable en una ubicación accesible

### 5. Configurar Google Sheets API

1. Ve a [Google Cloud Console](https://console.cloud.google.com/)
2. Crea un nuevo proyecto o selecciona uno existente
3. Habilita **Google Sheets API** y **Google Drive API**
4. Crea una cuenta de servicio:
   - Ve a "IAM y administración" > "Cuentas de servicio"
   - Crea una nueva cuenta de servicio
   - Descarga el archivo JSON de credenciales
5. Comparte tu Google Sheet con el email de la cuenta de servicio

### 6. Configurar Variables de Entorno

Copia el archivo de ejemplo y configúralo:

```bash
cp .env.example .env
```

Edita `.env` con tus valores:

```env
# ChromeDriver Configuration
CHROMEDRIVER_PATH=/ruta/a/chromedriver

# Google Sheets Configuration
GOOGLE_SHEET_ID=tu_id_de_google_sheet
SHEET_NAME=Compras
CREDENTIALS_PATH=/ruta/a/credenciales.json

# Scraping Configuration
HEADLESS_MODE=True
PAGE_LOAD_TIMEOUT=30
IMPLICIT_WAIT=10

# Logging
LOG_LEVEL=INFO
LOG_FILE=scraper.log
```

**Obtener el GOOGLE_SHEET_ID:**
De la URL de tu Google Sheet: `https://docs.google.com/spreadsheets/d/[ESTE_ES_EL_ID]/edit`

## 📖 Uso

### Uso Básico

```python
from scraper import WebScraperOrchestrator

# Definir URLs a scrapear
urls = {
    'ebay': 'https://www.ebay.com/sch/i.html?_nkw=electronics',
    'amazon': 'https://www.amazon.com/s?k=electronics',
}

# Ejecutar scraper
orquestador = WebScraperOrchestrator()
productos = orquestador.ejecutar(urls, guardar=True)
```

### Ejecutar el Script Principal

```bash
python scraper.py
```

### Personalizar URLs

Edita la función `main()` en `scraper.py`:

```python
urls_ejemplo = {
    'ebay': 'https://www.ebay.com/sch/i.html?_nkw=tu_busqueda',
    'amazon': 'https://www.amazon.com/s?k=tu_busqueda',
    'gunmagwarehouse': 'https://gunmagwarehouse.com/categoria',
    'academy': 'https://www.academy.com/shop/categoria'
}
```

## 🏗️ Arquitectura

### Estructura del Proyecto

```
compras-usa/
├── scraper.py              # Script principal
├── requirements.txt        # Dependencias
├── .env.example           # Plantilla de configuración
├── .gitignore             # Archivos ignorados por Git
├── README.md              # Esta documentación
└── scraper.log            # Logs generados (se crea automáticamente)
```

### Componentes Principales

- **GoogleSheetsManager**: Gestiona la conexión y escritura en Google Sheets
- **SeleniumDriver**: Configura y gestiona el driver de Selenium
- **BaseScraper**: Clase base para todos los scrapers
- **[Sitio]Scraper**: Scrapers específicos para cada sitio web
- **WebScraperOrchestrator**: Coordina todo el proceso de scraping

### Flujo de Ejecución

1. **Validación de Configuración**: Verifica que todas las variables estén configuradas
2. **Inicialización**: Crea instancias de driver, scrapers y conexión a Sheets
3. **Scraping**: Extrae datos de cada sitio especificado
4. **Almacenamiento**: Guarda los productos en Google Sheets
5. **Limpieza**: Cierra conexiones y libera recursos

## 🔍 Logs y Debugging

Los logs se guardan en:
- **Archivo**: `scraper.log` (nivel DEBUG)
- **Consola**: stdout (nivel INFO)

Formato de log:
```
2026-01-10 12:00:00 - web_scraper - INFO - Mensaje del log
```

Cambiar nivel de logging en `.env`:
```env
LOG_LEVEL=DEBUG  # DEBUG, INFO, WARNING, ERROR, CRITICAL
```

## 🛠️ Extender con Nuevos Scrapers

Para agregar un nuevo sitio web:

1. Crea una nueva clase que herede de `BaseScraper`:

```python
class NuevoSitioScraper(BaseScraper):
    def __init__(self, driver: webdriver.Chrome):
        super().__init__(driver)
        self.nombre_sitio = "NuevoSitio"
    
    def extraer_datos(self, url: str) -> List[Dict[str, str]]:
        productos = []
        # Implementar lógica de scraping
        return productos
```

2. Registra el scraper en `WebScraperOrchestrator.inicializar()`:

```python
self.scrapers = {
    # ... scrapers existentes ...
    'nuevositio': NuevoSitioScraper(driver)
}
```

## ⚠️ Consideraciones Importantes

### Legales y Éticas

- ✅ Respeta los términos de servicio de cada sitio web
- ✅ No realices scraping excesivo que pueda afectar al sitio
- ✅ Considera agregar delays entre requests
- ✅ Verifica si los sitios ofrecen APIs oficiales

### Limitaciones

- Los selectores CSS/HTML pueden cambiar cuando los sitios actualizan su diseño
- Algunos sitios pueden bloquear bots (usar headers y delays apropiados)
- El modo headless puede ser detectado por algunos sitios

### Mantenimiento

- Actualiza ChromeDriver cuando actualices Chrome
- Revisa los logs regularmente para detectar fallos
- Actualiza los selectores si los sitios cambian su estructura

## 🔒 Seguridad

- ❌ **NUNCA** commits archivos de credenciales (`credenciales.json`)
- ❌ **NUNCA** commits el archivo `.env` con valores reales
- ✅ Usa `.gitignore` para excluir archivos sensibles
- ✅ Usa variables de entorno para configuración
- ✅ Rota las credenciales periódicamente

## 🐛 Troubleshooting

### Error: ChromeDriver no encontrado

```bash
# Verifica que la ruta en .env sea correcta
# Windows: CHROMEDRIVER_PATH=C:\\ruta\\a\\chromedriver.exe
# Linux/Mac: CHROMEDRIVER_PATH=/ruta/a/chromedriver
```

### Error: No se puede conectar a Google Sheets

1. Verifica que el archivo de credenciales existe
2. Confirma que las APIs están habilitadas
3. Verifica que compartiste la hoja con la cuenta de servicio

### Error: Selectores no encuentran elementos

Los sitios web cambian frecuentemente. Inspecciona la página y actualiza los selectores en el scraper correspondiente.

## 📝 Licencia

Este proyecto es de código abierto. Úsalo responsablemente.

## 🤝 Contribuciones

Las contribuciones son bienvenidas:

1. Fork el proyecto
2. Crea una rama para tu feature (`git checkout -b feature/nueva-funcionalidad`)
3. Commit tus cambios (`git commit -m 'Agrega nueva funcionalidad'`)
4. Push a la rama (`git push origin feature/nueva-funcionalidad`)
5. Abre un Pull Request

## 📧 Soporte

Para problemas o preguntas, abre un issue en el repositorio.

---

**Nota**: Este scraper está diseñado para propósitos educativos y de automatización personal. Úsalo de manera responsable y ética.
