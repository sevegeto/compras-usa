#!/bin/bash
# Quick Start Script
# Este script ejecuta el scraper con la configuración predeterminada

# ID de la hoja de Google Sheets
SPREADSHEET_ID="1bWSMhd-cFsR_0iYiiRHkr-zKU7vbqLvW-c5k-5Fxgo0"

# Ejecutar el scraper
python main.py "$SPREADSHEET_ID" \
  --sheet "Compras" \
  --column "H" \
  --start-row 3 \
  --headless

echo ""
echo "Para ver más opciones, ejecuta: python main.py --help"
