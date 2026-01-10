/*******************************************************
 * 🧠 AI SPREADSHEET STRUCTURE MAPPER
 * -----------------------------------------------------
 * Salida:
 *   → Hoja "estructura"
 *
 * Ejecución:
 *   UI     → Menú
 *   Editor → Run main
 *   CLI    → clasp run main
 *******************************************************/

/* =====================================================
 * UI
 

function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu('AI Helper')
    .addItem('Generar Mapa de Estructura', 'uiGenerarMapa')
    .addToUi();
}
* ===================================================== */



/**
 * SOLO UI (menú)
 */
function uiGenerarMapa() {
  const json = generarMapaIA_sinInteraccion();
  escribirMapaEnHoja(json);

  SpreadsheetApp.getUi().alert(
    'Estructura generada',
    'El mapa fue guardado en la hoja "estructura".',
    SpreadsheetApp.getUi().ButtonSet.OK
  );
}

/* =====================================================
 * ENTRYPOINT TERMINAL / EDITOR
 * ===================================================== */

/**
 * Seguro para terminal y editor
 * clasp run main
 */
function main() {
  const json = generarMapaIA_sinInteraccion();
  escribirMapaEnHoja(json);
  Logger.log('Mapa generado y guardado en la hoja "estructura".');
}

/* =====================================================
 * CORE API (SIN UI)
 * ===================================================== */

function generarMapaIA_sinInteraccion() {
  const opciones = {
    sampleRowsCount: 3,
    ignoreHiddenSheets: true,
    excludeSheets: ['Config', 'Dictionary', 'HiddenMeta', 'estructura'],
    maxCols: 0,
    maxRowsForSample: 1000,
    trimHeaders: true
  };

  const mapa = construirMapaSpreadsheet(opciones);
  return JSON.stringify(mapa, null, 2);
}

/* =====================================================
 * CORE
 * ===================================================== */

function construirMapaSpreadsheet(options = {}) {
  const {
    sampleRowsCount = 3,
    ignoreHiddenSheets = true,
    excludeSheets = [],
    trimHeaders = true,
    maxCols = 0,
    maxRowsForSample = 1000
  } = options;

  const ss = SpreadsheetApp.getActive();
  const sheets = ss.getSheets();

  const map = {
    spreadsheet_name: ss.getName(),
    spreadsheet_id: ss.getId(),
    generated_at_iso: new Date().toISOString(),
    sheets: {}
  };

  sheets.forEach((sheet, index) => {
    const name = sheet.getName();
    if (excludeSheets.includes(name)) return;
    if (ignoreHiddenSheets && sheet.isSheetHidden()) return;

    const lastRow = sheet.getLastRow();
    const lastCol = sheet.getLastColumn();
    if (!lastRow || !lastCol) return;

    const colCount = maxCols > 0 ? Math.min(lastCol, maxCols) : lastCol;

    const rawHeaders = sheet.getRange(1, 1, 1, colCount).getValues()[0];
    const headers = trimHeaders
      ? limpiarYNormalizarHeaders(rawHeaders)
      : rawHeaders.map(h => h ?? '');

    const sampleCount = Math.min(sampleRowsCount, lastRow - 1, maxRowsForSample);
    const sampleRows = sampleCount > 0
      ? sheet.getRange(2, 1, sampleCount, colCount).getValues()
      : [];

    map.sheets[name] = {
      meta: {
        sheet_id: sheet.getSheetId(),
        index,
        hidden: sheet.isSheetHidden(),
        last_row: lastRow,
        last_column: lastCol
      },
      headers,
      column_types: inferirTiposPorColumna(sampleRows, colCount),
      sample_rows: sampleRows
    };
  });

  return map;
}

/* =====================================================
 * SALIDA → HOJA "estructura"
 * ===================================================== */

function escribirMapaEnHoja(json) {
  const ss = SpreadsheetApp.getActive();
  const sheetName = 'estructura';

  let sheet = ss.getSheetByName(sheetName);
  if (!sheet) {
    sheet = ss.insertSheet(sheetName);
  }

  sheet.clear();

  // Metadatos
  sheet.getRange('A1').setValue('Mapa estructural del Spreadsheet');
  sheet.getRange('A2').setValue('Generado en:');
  sheet.getRange('B2').setValue(new Date());
  sheet.getRange('A3').setValue('JSON completo:');

  // JSON (una sola celda, fácil de copiar)
  sheet.getRange('A5')
    .setValue(json)
    .setWrap(true);

  // Ajustes visuales
  sheet.setColumnWidth(1, 900);
  sheet.setFrozenRows(4);
}

/* =====================================================
 * UTILIDADES
 * ===================================================== */

function limpiarYNormalizarHeaders(headers) {
  const seen = {};
  return headers.map((h, i) => {
    let name = String(h || '').trim() || `col_${i + 1}`;
    const base = name;
    let n = 2;
    while (seen[name]) {
      name = `${base}__${n++}`;
    }
    seen[name] = true;
    return name;
  });
}

function detectarTipoValor(v) {
  if (v === null || v === '' || v === undefined) return 'empty';
  if (v instanceof Date) return 'date';
  if (typeof v === 'boolean') return 'boolean';
  if (typeof v === 'number') return Number.isFinite(v) ? 'number' : 'number_nan';
  return 'string';
}

function inferirTiposPorColumna(rows, colCount) {
  if (!rows.length) return Array(colCount).fill('empty');

  return Array.from({ length: colCount }, (_, c) => {
    const counts = {};
    rows.forEach(r => {
      const t = detectarTipoValor(r[c]);
      counts[t] = (counts[t] || 0) + 1;
    });

    const types = Object.keys(counts).filter(t => t !== 'empty');
    if (!types.length) return 'empty';
    if (types.length === 1) return types[0];
    if (types.includes('string')) return 'string';
    return 'mixed';
  });
}
