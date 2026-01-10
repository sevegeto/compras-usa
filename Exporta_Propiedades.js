/**
 * Exporta todas las Script Properties del proyecto actual
 * a una hoja llamada "Propiedades".
 *
 * - Si la hoja no existe, la crea.
 * - Si existe, la limpia completamente.
 * - Escribe encabezados: Propiedad | Valor
 * - Vuelca todas las propiedades encontradas.
 *
 * Uso recomendado:
 * Ejecutar manualmente o desde un menú personalizado.
 */
function exportarPropiedadesProyecto() {
  const NOMBRE_HOJA = 'Propiedades';
  const ss = SpreadsheetApp.getActiveSpreadsheet();

  // Obtener todas las propiedades del proyecto (Script Properties)
  const scriptProperties = PropertiesService.getScriptProperties().getProperties();

  // Obtener o crear la hoja "Propiedades"
  let hoja = ss.getSheetByName(NOMBRE_HOJA);
  if (!hoja) {
    hoja = ss.insertSheet(NOMBRE_HOJA);
  } else {
    hoja.clearContents();
  }

  // Encabezados
  const headers = [['Propiedad', 'Valor']];
  hoja.getRange(1, 1, 1, 2).setValues(headers);

  // Convertir propiedades a arreglo
  const filas = [];
  for (const key in scriptProperties) {
    if (scriptProperties.hasOwnProperty(key)) {
      filas.push([key, scriptProperties[key]]);
    }
  }

  // Escribir datos si existen propiedades
  if (filas.length > 0) {
    hoja.getRange(2, 1, filas.length, 2).setValues(filas);
  }

  // Ajustes visuales
  hoja.autoResizeColumns(1, 2);
  hoja.getRange('1:1').setFontWeight('bold');

  Logger.log(`Se exportaron ${filas.length} propiedades a la hoja "${NOMBRE_HOJA}".`);
}




/**
 * Lee la hoja "Propiedades" y crea / actualiza
 * todas las Script Properties del proyecto.
 *
 * Requisitos:
 * - Hoja llamada "Propiedades"
 * - Header exacto:
 *   Col A: Propiedad
 *   Col B: Valor
 *
 * Seguridad:
 * - NO elimina propiedades existentes que no estén en la hoja.
 * - Sobrescribe únicamente las propiedades listadas.
 */
function importarPropiedadesDesdeHoja() {
  const NOMBRE_HOJA = 'Propiedades';
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const hoja = ss.getSheetByName(NOMBRE_HOJA);

  if (!hoja) {
    throw new Error(`La hoja "${NOMBRE_HOJA}" no existe.`);
  }

  const lastRow = hoja.getLastRow();
  if (lastRow < 2) {
    Logger.log('No hay propiedades para importar.');
    return;
  }

  // Leer datos (desde fila 2)
  const data = hoja.getRange(2, 1, lastRow - 1, 2).getValues();

  const scriptProperties = PropertiesService.getScriptProperties();
  let totalImportadas = 0;

  data.forEach((fila, index) => {
    const propiedad = String(fila[0] || '').trim();
    const valor = fila[1];

    if (!propiedad) {
      Logger.log(`Fila ${index + 2} ignorada: nombre de propiedad vacío.`);
      return;
    }

    // Apps Script solo acepta strings como valor
    scriptProperties.setProperty(propiedad, String(valor));
    totalImportadas++;
  });

  Logger.log(`Importación finalizada. ${totalImportadas} propiedades creadas/actualizadas.`);
}
