/**
 * CENTRALIZED SHEET CONFIGURATION
 * Single source of truth for all sheet structures and column mappings
 * Prevents inconsistencies across different modules
 */

const SHEET_CONFIG = {
  // Productos Sheet (Main Product Inventory)
  PRODUCTOS: {
    NAME: 'Productos',
    START_ROW: 6,
    HEADERS_ROW: 5,
    COLUMNS: {
      ID: { index: 0, letter: 'A', name: 'ID' },
      CANTIDAD: { index: 1, letter: 'B', name: 'Cantidad' },
      UPC: { index: 2, letter: 'C', name: 'UPC/GTIN' },
      TITULO: { index: 3, letter: 'D', name: 'Título' },
      SKU: { index: 4, letter: 'E', name: 'SKU' },
      UNIDADES_VENDIDAS: { index: 5, letter: 'F', name: 'Unidades Vendidas' },
      DIAS_MANUFACTURA: { index: 6, letter: 'G', name: 'Días de Manufactura' },
      FECHA_REACTIVACION: { index: 7, letter: 'H', name: 'Fecha Reactivación' },
      STATUS: { index: 33, letter: 'AH', name: 'Estado' }
    }
  },

  // Snapshot Inventario (Real-time ML inventory)
  SNAPSHOT_INVENTARIO: {
    NAME: 'Snapshot_Inventario',
    START_ROW: 2,
    HEADERS_ROW: 1,
    COLUMNS: {
      ID: { index: 0, letter: 'A', name: 'ID' },
      SKU: { index: 1, letter: 'B', name: 'SKU' },
      TITULO: { index: 2, letter: 'C', name: 'Título' },
      STOCK: { index: 3, letter: 'D', name: 'Stock' },
      LAST_UPDATE: { index: 4, letter: 'E', name: 'Última Actualización' }
    }
  },

  // UpSeller Sheet (Manual tracking)
  UPSELLER: {
    NAME: 'UpSeller',
    START_ROW: 2,
    HEADERS_ROW: 1,
    COLUMNS: {
      SKU: { index: 0, letter: 'A', name: 'SKU' },
      ACTIVA: { index: 17, letter: 'R', name: 'Está activa en venta' }
    }
  },

  // Pausadas con ventas
  PAUSADAS: {
    NAME: 'Pausadas con ventas',
    START_ROW: 6,
    HEADERS_ROW: 5,
    COLUMNS: {
      ID: { index: 0, letter: 'A', name: 'ID' },
      CANTIDAD: { index: 1, letter: 'B', name: 'Cantidad' },
      UPC: { index: 2, letter: 'C', name: 'UPC/GTIN' },
      TITULO: { index: 3, letter: 'D', name: 'Título' },
      SKU: { index: 4, letter: 'E', name: 'SKU' },
      UNIDADES_VENDIDAS: { index: 5, letter: 'F', name: 'Unidades Vendidas' },
      DIAS_MANUFACTURA: { index: 6, letter: 'G', name: 'Días de Manufactura' },
      FECHA_REACTIVACION: { index: 7, letter: 'H', name: 'Fecha Reactivación' }
    }
  },

  // Logs
  LOGS: {
    NAME: 'Logs',
    START_ROW: 2,
    HEADERS_ROW: 1,
    COLUMNS: {
      TIMESTAMP: { index: 0, letter: 'A', name: 'Timestamp' },
      LEVEL: { index: 1, letter: 'B', name: 'Level' },
      CONTEXT: { index: 2, letter: 'C', name: 'Context' },
      MESSAGE: { index: 3, letter: 'D', name: 'Message' },
      DETAILS: { index: 4, letter: 'E', name: 'Details' }
    }
  }
};

/**
 * Validates that sheet headers match expected configuration
 * @param {string} sheetName - Name of sheet to validate
 * @returns {Object} { valid: boolean, errors: string[] }
 */
function validateSheetHeaders(sheetName) {
  const config = Object.values(SHEET_CONFIG).find(s => s.NAME === sheetName);
  if (!config) {
    return { valid: false, errors: [`Sheet configuration not found for: ${sheetName}`] };
  }

  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(sheetName);
  if (!sheet) {
    return { valid: false, errors: [`Sheet not found: ${sheetName}`] };
  }

  const errors = [];
  const headersRow = config.HEADERS_ROW;
  const actualHeaders = sheet.getRange(headersRow, 1, 1, sheet.getLastColumn()).getValues()[0];

  Object.entries(config.COLUMNS).forEach(([key, col]) => {
    const expectedName = col.name;
    const actualName = actualHeaders[col.index];
    
    if (actualName !== expectedName) {
      errors.push(`Column ${col.letter} (${key}): Expected "${expectedName}", found "${actualName}"`);
    }
  });

  return { valid: errors.length === 0, errors };
}

/**
 * Gets a cell reference using config
 * @param {string} sheetName - Sheet name constant (e.g., 'PRODUCTOS')
 * @param {number} row - Row number
 * @param {string} columnKey - Column key from config (e.g., 'ID', 'SKU')
 * @returns {Range} Sheet range object
 */
function getConfiguredRange(sheetName, row, columnKey) {
  const config = SHEET_CONFIG[sheetName];
  if (!config) throw new Error(`Unknown sheet config: ${sheetName}`);
  
  const column = config.COLUMNS[columnKey];
  if (!column) throw new Error(`Unknown column key: ${columnKey} in ${sheetName}`);

  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(config.NAME);
  if (!sheet) throw new Error(`Sheet not found: ${config.NAME}`);

  return sheet.getRange(row, column.index + 1);
}

/**
 * Gets column index by key
 * @param {string} sheetName - Sheet config name
 * @param {string} columnKey - Column key
 * @returns {number} Zero-based column index
 */
function getColumnIndex(sheetName, columnKey) {
  const config = SHEET_CONFIG[sheetName];
  if (!config) throw new Error(`Unknown sheet config: ${sheetName}`);
  
  const column = config.COLUMNS[columnKey];
  if (!column) throw new Error(`Unknown column key: ${columnKey}`);
  
  return column.index;
}
