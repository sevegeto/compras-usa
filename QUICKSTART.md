# Guía de Inicio Rápido

Esta guía te ayudará a configurar y ejecutar el scraper en minutos.

## ✅ Checklist de Configuración

- [ ] Python 3.8+ instalado
- [ ] Chrome instalado
- [ ] ChromeDriver descargado
- [ ] Cuenta de servicio de Google creada
- [ ] Google Sheet creado y compartido con la cuenta de servicio

## 🚀 Pasos Rápidos

### 1. Instalar dependencias

```bash
pip install -r requirements.txt
```

### 2. Configurar credenciales

Copia el archivo de ejemplo:
```bash
cp .env.example .env
```

Edita `.env` con tus valores:
- `CHROMEDRIVER_PATH`: Ruta completa al ejecutable de ChromeDriver
- `GOOGLE_SHEET_ID`: ID de tu Google Sheet (de la URL)
- `CREDENTIALS_PATH`: Ruta al archivo JSON de credenciales de Google
- `SHEET_NAME`: Nombre de la pestaña en tu Google Sheet (default: "Compras")

### 3. Configurar URLs (Opcional)

Copia el archivo de configuración:
```bash
cp config_example.py config.py
```

Edita `config.py` con las URLs que quieres scrapear.

### 4. Ejecutar el scraper

```bash
python scraper.py
```

## 📊 Resultado

Los productos extraídos se guardarán automáticamente en tu Google Sheet con las siguientes columnas:

- Sitio
- Nombre
- Precio
- Disponibilidad
- URL
- Fecha

## 🔍 Verificar logs

Si algo sale mal, revisa el archivo `scraper.log` para detalles.

## 💡 Consejos

1. **Prueba primero con una sola URL** para verificar que todo funciona
2. **Revisa los selectores CSS** en el scraper si no se extraen datos
3. **Usa modo no-headless** (`HEADLESS_MODE=False`) para debugging
4. **Respeta los términos de servicio** de cada sitio web

## ❓ Problemas Comunes

### "ChromeDriver not found"
- Verifica que la ruta en `.env` sea correcta
- Asegúrate de que ChromeDriver tenga permisos de ejecución (Linux/Mac)

### "Cannot connect to Google Sheets"
- Verifica que compartiste el sheet con el email de la cuenta de servicio
- Confirma que las APIs están habilitadas en Google Cloud Console

### "No products found"
- Los selectores CSS pueden haber cambiado
- Inspecciona la página web y actualiza los selectores en el scraper correspondiente

## 📚 Más información

Lee el [README.md](README.md) completo para documentación detallada.
