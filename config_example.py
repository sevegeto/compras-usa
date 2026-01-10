"""
Archivo de ejemplo para personalizar las URLs a scrapear.

Copia este archivo y modifícalo según tus necesidades:
    cp config_example.py config.py

Luego importa tus URLs en scraper.py:
    from config import URLS_TO_SCRAPE
"""

# URLs de ejemplo para cada sitio
URLS_TO_SCRAPE = {
    # eBay - Búsquedas de productos
    'ebay': 'https://www.ebay.com/sch/i.html?_nkw=electronics',
    
    # Amazon - Búsquedas de productos
    'amazon': 'https://www.amazon.com/s?k=electronics',
    
    # GunMagWarehouse - Categorías específicas
    # 'gunmagwarehouse': 'https://gunmagwarehouse.com/ar-15-magazines.html',
    
    # Academy Sports + Outdoors - Categorías
    # 'academy': 'https://www.academy.com/shop/browse/sports-outdoors',
}

# Configuración adicional (opcional)
SCRAPING_CONFIG = {
    'delay_entre_sitios': 2,  # Segundos de espera entre cada sitio
    'max_productos_por_sitio': 50,  # Limitar resultados por sitio
    'reintentos_en_error': 3,  # Número de reintentos si falla un sitio
}
