const API_CONFIG_PRODUCTOS = {
  BASE_URL: 'https://api.mercadolibre.com',
  BATCH_SIZE: 20,
  MAX_RETRIES: 3,
  RETRY_DELAY: 1000, // milliseconds
};


const SHEETS_PRODUCTOS = {
  PRODUCTOS: 'Productos',
  CONFIG_PRODUCTOS: 'Configuración',
  LOGS: 'Logs',
};

const START_ROW = 6; // Starting row to write data in sheet (row 5 for headers, row 6 for data)
const CLEAR_RANGE_START_ROW = 6;
const CLEAR_RANGE_NUM_COLUMNS = 34;
const CLEAR_RANGE_MAX_ROWS = 6000;


// Mapeo de columnas adaptado a tu hoja actual
const COLUMN_MAPPING = {
  ID_ITEM: 1,               // ID del producto en ML
  SKU: 2,                   // SKU propio o Seller SKU
  TITULO: 3,                // Título del producto
  STOCK_ACTUAL: 4,          // Cantidad disponible
  ULTIMA_SINCRONIZACION: 5, // Fecha de última actualización
  PRECIO_ML: 6,             // Precio en MercadoLibre
  GTIN: 7,                  // Código GTIN/EAN/UPC
  DIAS_ELABORACION: 8       // Tiempo de fabricación
};

// Orden de columnas para escribir en hoja
const COLUMN_ORDER = [
  "ID_ITEM",
  "SKU",
  "TITULO",
  "STOCK_ACTUAL",
  "ULTIMA_SINCRONIZACION",
  "PRECIO_ML",
  "GTIN",
  "DIAS_ELABORACION"
];


/**
 * Obtiene todos los IDs de productos del usuario de Mercado Libre y los escribe en la hoja.
 * @returns {Promise<Array<string>>} Array con los IDs de productos.
 */
async function obtenerMLMs() {
  const functionName = "obtenerMLMs";
  try {
    // refresca token y obtiene datos necesarios
    const accessToken = getAccessToken(); // This already handles refresh internally
    const props = PropertiesService.getScriptProperties();
    const usuarioId = props.getProperty('ML_USER_ID');
    if (!accessToken || !usuarioId) {
      throw new Error("Falta accessToken o usuarioId en propiedades del script.");
    }

    const api = new MercadoLibreAPI(accessToken);
    const allProducts = [];
    let scrollId = null;
    const limit = 100;

    // Primer request para obtener total y scroll_id
    const initialUrl = `${API_CONFIG_PRODUCTOS.BASE_URL}/users/${usuarioId}/items/search?search_type=scan&limit=1`;
    const initialResponse = await api.fetchWithRetry(initialUrl);
    const initialData = JSON.parse(initialResponse.getContentText());
    const totalItems = initialData.paging?.total || 0;
    scrollId = initialData.scroll_id;

    if (totalItems === 0) {
      Logger.log(`[${functionName}] No se encontraron productos.`);
      escribirProductosEnSheet([]);
      return [];
    }

    Logger.log(`[${functionName}] Total de productos reportados por ML: ${totalItems}`);

    // Loop para traer todos los IDs usando scroll
    do {
      if (!scrollId) break;
      const url = `${API_CONFIG_PRODUCTOS.BASE_URL}/users/${usuarioId}/items/search?search_type=scan&limit=${limit}&scroll_id=${scrollId}`;
      const response = await api.fetchWithRetry(url);
      const data = JSON.parse(response.getContentText());

      if (Array.isArray(data.results) && data.results.length > 0) {
        allProducts.push(...data.results);
      } else {
        Logger.log(`[${functionName}] No hay más resultados en el scroll.`);
        break;
      }

      scrollId = data.scroll_id;
      Utilities.sleep(200); // pequeño delay para no saturar la API
      Logger.log(`[${functionName}] Avance: ${allProducts.length}/${totalItems} IDs obtenidos`);

    } while (scrollId && allProducts.length < totalItems);

    // Escribir IDs en la hoja
    escribirProductosEnSheet(allProducts.map(id => [id]));
    Logger.log(`[${functionName}] IDs escritos en hoja. Total: ${allProducts.length}`);

    return allProducts;
  } catch (error) {
    Logger.log(`[${functionName}] Error: ${error.message}`);
    throw error; // opcional si quieres que la ejecución se detenga
  }
}



/**
 * Llena los datos completos de productos a partir de los IDs ya existentes en la hoja.
 * Obtiene los IDs de la columna A y actualiza toda la fila con los datos de ML.
 */
/**
 * Llena los datos de los productos en la hoja "Productos"
 * a partir de los IDs ya escritos en la columna A.
 */
async function llenarDatosDeIds() {
  const functionName = "llenarDatosDeIds";
  try {
    updateStatus("Iniciando llenado de datos desde IDs...");

    // Refrescar token y obtener acceso
    const accessToken = getAccessToken(); // This already handles refresh internally
    if (!accessToken) throw new Error("Falta access token");

    // Obtener IDs desde columna A de la hoja
    const sheet = verificarHoja(); // crea o devuelve hoja "Productos"
    const START_ROW = 2; // asumiendo encabezado en fila 1
    const lastRow = sheet.getLastRow();
    if (lastRow < START_ROW) {
      updateStatus("No hay IDs para procesar ❌");
      Logger.log(`[${functionName}] No hay IDs en la hoja.`);
      return 0;
    }

    const productIds = sheet.getRange(START_ROW, 1, lastRow - START_ROW + 1).getValues().flat();
    if (productIds.length === 0) {
      updateStatus("No hay IDs para procesar ❌");
      Logger.log(`[${functionName}] No hay IDs en la hoja.`);
      return 0;
    }

    const api = new MercadoLibreAPI(accessToken);
    const BATCH_SIZE = 20;
    const allData = [];

    for (let i = 0; i < productIds.length; i += BATCH_SIZE) {
      const batchIds = productIds.slice(i, i + BATCH_SIZE);
      const url = `${API_CONFIG_PRODUCTOS.BASE_URL}/items?ids=${batchIds.join(',')}&include_attributes=all`;

      try {
        const response = await api.fetchWithRetry(url);
        const data = JSON.parse(response.getContentText());

        if (Array.isArray(data)) {
          for (const item of data) {
            if (item?.code === 200) {
              const product = item.body;

              // Extraemos solo los campos que coinciden con tus columnas
              const row = [
                product.id || "",                      // ID_Item
                product.seller_custom_field || "",     // SKU
                product.title || "",                   // Titulo
                product.available_quantity || 0,       // Stock_Actual
                product.date_last_updated || "",       // Ultima_Sincronizacion
                product.price || 0,                    // Precio_ML
                product.gtin || "",                    // GTIN
                product.manufacturing_days || ""       // Dias_Elaboracion
              ];

              allData.push(row);
            }
          }
        }

        updateProgressStatus("Procesando productos", Math.min(i + BATCH_SIZE, productIds.length), productIds.length);

      } catch (error) {
        Logger.log(`[${functionName}] Error batch ${i}: ${error}`);
      }
    }

    // Escribir todos los datos en la hoja
    if (allData.length > 0) {
      const range = sheet.getRange(START_ROW, 1, allData.length, allData[0].length);
      range.setValues(allData);
      SpreadsheetApp.flush();
      updateStatus(`Datos completados ✅ ${allData.length} productos procesados`);
      Logger.log(`[${functionName}] Llenado completo de ${allData.length} productos.`);
    } else {
      updateStatus("No se procesó ningún producto ❌");
      Logger.log(`[${functionName}] No se procesó ningún producto.`);
    }

    return allData.length;

  } catch (error) {
    Logger.log(`[${functionName}] Error: ${error}`);
    updateStatus(`Error llenando datos: ${error.message}`);
    throw error;
  }
}



// ============================================================================
// UI FUNCTIONS
// ============================================================================

/**
 * Updates a status cell in the "Productos" sheet and shows a toast message.
 * @param {string} statusText The status message to display.
 */
function updateStatus(statusText) {
  try {
    const sheet = verificarHoja();
    const statusCell = sheet.getRange("B4");
    const timestamp = new Date().toLocaleString("es-MX", { timeZone: "America/Mexico_City" });
    const formattedStatus = `${statusText} [${timestamp}]`;
    statusCell.setValue(formattedStatus).setFontWeight("bold");
    
    try {
      SpreadsheetApp.getActiveSpreadsheet().toast(statusText, "Estado", 3);
    } catch (e) {
      Logger.log(`UI Toast not available: ${statusText}`);
    }
  } catch (error) {
    Logger.log(`Could not update status cell B4: ${error.message}`);
  }
}




// MercadoLibreAPI class is now defined in APIClient.js
// Removed duplicate class definition to avoid conflicts


function verificarHoja() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(SHEETS_PRODUCTOS.PRODUCTOS);
  
  if (!sheet) {
    Logger.log(`Hoja "${SHEETS_PRODUCTOS.PRODUCTOS}" no encontrada. Creándola...`);
    sheet = ss.insertSheet(SHEETS_PRODUCTOS.PRODUCTOS);
    
    // Add headers if the sheet is newly created
    const headerRow = START_ROW - 1; // Headers go one row above where data starts
    if (headerRow > 0) {
      const headers = COLUMN_ORDER.map(col => col.replace(/_/g, ' ').split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()).join(' '));
      sheet.getRange(headerRow, 1, 1, headers.length).setValues([headers]).setFontWeight("bold").setBackground("#cfe2f3"); // Light blue background
      sheet.setFrozenRows(headerRow);
      sheet.autoResizeColumns(1, headers.length); // Auto-resize columns
    }
    Logger.log(`✅ Hoja "${SHEETS_PRODUCTOS.PRODUCTOS}" creada con encabezados.`);
  }
  
  return sheet;
}


class ErrorHandler {
  static handle(error, context) {
    const timestamp = new Date().toISOString();
    const errorMessage = `[${timestamp}] ${context}: ${error.message}`;
    Logger.log(`Error: ${errorMessage}`);

    try {
      const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEETS_PRODUCTOS.LOGS);
      if (!sheet) {
        Logger.log(`Warning: Logs sheet "${SHEETS_PRODUCTOS.LOGS}" not found.`);
        return;
      }
      sheet.appendRow([timestamp, context, error.message, error.stack || '']);
    } catch (logError) {
      Logger.log(`Error writing to log sheet: ${logError.message}`);
    }
  }
}


/**
 * Escribe los IDs de productos en la hoja activa, columna A.
 * Mantiene logs, manejo de errores y flush para asegurar que se guarden los cambios.
 * @param {Array<Array<string>>} productsArray Array de arrays, cada elemento es [ID]
 */
function escribirProductosEnSheet(productsArray) {
  const functionName = "escribirProductosEnSheet";
  try {
    // Obtiene la hoja destino
    const sheet = verificarHoja(); // Asegúrate de que devuelve la hoja correcta
    const startRow = START_ROW || 2; // Default fila 2 si no está definido

    // Limpiar la columna A desde startRow hasta la última fila con datos
    const lastRowInSheet = sheet.getLastRow();
    if (lastRowInSheet >= startRow) {
      sheet.getRange(startRow, 1, lastRowInSheet - startRow + 1, 1).clearContent();
      Logger.log(`[${functionName}] Cleared column A from row ${startRow} to ${lastRowInSheet}.`);
    } else {
      Logger.log(`[${functionName}] No existing data to clear in column A from row ${startRow}.`);
    }

    // Si no hay productos, terminar
    if (!productsArray || productsArray.length === 0) {
      Logger.log(`[${functionName}] No products to write to the sheet (column A).`);
      return;
    }

    // Escribir los IDs en la hoja
    const range = sheet.getRange(startRow, 1, productsArray.length, 1);
    range.setValues(productsArray);

    // Forzar que se guarden los cambios inmediatamente
    SpreadsheetApp.flush(); 

    Logger.log(`[${functionName}] Wrote ${productsArray.length} product IDs to column A. Changes flushed.`);
  } catch (error) {
    // Manejo de errores centralizado
    if (typeof ErrorHandler !== "undefined" && ErrorHandler.handle) {
      ErrorHandler.handle(error, functionName);
    } else {
      Logger.log(`[${functionName}] Error: ${error.message}`);
    }
    throw error;
  }
}


/**
 * Updates a progress cell in the "Productos" sheet with percentage and color.
 * @param {string} step The current step description.
 * @param {number} current The current count of items processed.
 * @param {number} total The total count of items.
 */
function updateProgressStatus(step, current, total) {
  try {
    const sheet = verificarHoja();
    const percentage = total > 0 ? Math.round((current / total) * 100) : 0;
    const progressCell = sheet.getRange("E4");
    
    progressCell.setValue(`${step}: ${current}/${total} (${percentage}%)`);
    progressCell.setFontWeight("bold");
    
    if (percentage >= 75) {
      progressCell.setBackground("#b6d7a8"); 
    } else if (percentage >= 25) {
      progressCell.setBackground("#ffe599"); 
    } else {
      progressCell.setBackground("#f4cccc"); 
    }
  } catch (error) {
    Logger.log(`Could not update progress cell E4: ${error.message}`);
  }
}
