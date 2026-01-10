from flask import Flask, jsonify, request
from pyngrok import ngrok
import threading
from scraper import WebScraperOrchestrator
import logging
import os
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

def run_scraper_async(urls):
    """Ejecuta el scraper en un hilo separado para no bloquear la respuesta"""
    try:
        orchestrator = WebScraperOrchestrator()
        orchestrator.ejecutar(urls)
        logger.info("Scraping finalizado correctamente desde el servidor.")
    except Exception as e:
        logger.error(f"Error ejecutando scraper: {e}")

@app.route('/run-scraper', methods=['POST'])
def trigger_scraper():
    """Endpoint que recibe la orden desde Google Sheets"""
    data = request.json
    urls = data.get('urls')
    
    if not urls:
        return jsonify({"status": "error", "message": "No se proporcionaron URLs"}), 400

    # Ejecutar en segundo plano
    thread = threading.Thread(target=run_scraper_async, args=(urls,))
    thread.start()

    return jsonify({"status": "success", "message": "Scraper iniciado en segundo plano"}), 200

@app.route('/')
def home():
    return "Servidor de Scraping Activo. Usa /run-scraper para iniciar."

if __name__ == '__main__':
    # Abrir túnel ngrok
    try:
        public_url = ngrok.connect(PORT).public_url
        print(f"\n * TÚNEL NGROK ACTIVO: {public_url}")
        print(f" * Copia esta URL y pégala en tu Google Sheet (ej: {public_url}/run-scraper)\n")
    except Exception as e:
        print(f"Error iniciando ngrok: {e}")
        print("Asegúrate de ejecutar el servidor localmente.")

    app.run(port=PORT)
