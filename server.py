from flask import Flask, jsonify, request
from pyngrok import ngrok
import threading
from scraper import WebScraperOrchestrator, GoogleSheetsManager
import logging
import os
import json
from datetime import datetime
from dotenv import load_dotenv

# Cargar variables de entorno
load_dotenv()

app = Flask(__name__)
logger = logging.getLogger('web_scraper')

# Configurar puerto y token de ngrok si existe
PORT = 5000
NGROK_AUTH_TOKEN = os.getenv('NGROK_AUTH_TOKEN') 

if NGROK_AUTH_TOKEN:
    ngrok.set_auth_token(NGROK_AUTH_TOKEN)

# Inicializar Manager de Sheets
sheets_manager = GoogleSheetsManager()

def run_scraper_async(urls):
    """Ejecuta el scraper en un hilo separado"""
    try:
        orchestrator = WebScraperOrchestrator()
        orchestrator.ejecutar(urls)
        logger.info("Scraping finalizado correctamente.")
    except Exception as e:
        logger.error(f"Error ejecutando scraper: {e}")

@app.route('/run-scraper', methods=['POST'])
def trigger_scraper():
    """Endpoint para iniciar el scraper desde Google Sheets"""
    data = request.json
    urls = data.get('urls')
    
    if not urls:
        return jsonify({"status": "error", "message": "No se proporcionaron URLs"}), 400

    thread = threading.Thread(target=run_scraper_async, args=(urls,))
    thread.start()

    return jsonify({"status": "success", "message": "Scraper iniciado"}), 200

@app.route('/webhook', methods=['POST'])
def mercadolibre_webhook():
    """
    Endpoint para recibir notificaciones de MercadoLibre
    Bypasea la restricción de Google Apps Script
    """
    try:
        notification = request.json
        logger.info(f"🔔 Notificación ML recibida: {json.dumps(notification)}")

        if notification.get('topic') == 'items':
            resource = notification.get('resource', '')
            item_id = resource.split('/')[-1] if resource else 'UNKNOWN'
            
            # Registrar en la hoja Log_Movimientos
            # Asumimos que la hoja ya tiene la estructura creada por el script main.js
            try:
                sheet = sheets_manager.client.open_by_key(os.getenv('GOOGLE_SHEET_ID')).worksheet('Log_Movimientos')
                
                # Timestamp, ItemID, SKU, Old, New, Diff, Motivo, Estado
                timestamp = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
                row = [timestamp, item_id, 'PENDING_CHECK', 0, 0, 0, 'WEBHOOK_PYTHON', 'Recibido']
                
                sheet.append_row(row)
                logger.info(f"✅ Notificación registrada en Sheets para {item_id}")
                
            except Exception as e:
                logger.error(f"❌ Error escribiendo en Sheets: {e}")
                # No fallamos la request de ML, solo logueamos el error interno

        return jsonify({"status": "ok"}), 200

    except Exception as e:
        logger.error(f"Error procesando webhook: {e}")
        return jsonify({"status": "error", "message": str(e)}), 500

@app.route('/')
def home():
    return "🚀 Servidor Puente: Scraper + Webhook ML Activo"

if __name__ == '__main__':
    try:
        public_url = ngrok.connect(PORT).public_url
        print(f"\n" + "="*50)
        print(f" * TÚNEL ACTIVO: {public_url}")
        print(f" * URL WEBHOOK ML: {public_url}/webhook")
        print(f" * URL SCRAPER:    {public_url}/run-scraper")
        print("="*50 + "\n")
    except Exception as e:
        print(f"Error ngrok: {e}")

    app.run(port=PORT)