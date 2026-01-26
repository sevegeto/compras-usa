function formatearCompras() {
  const functionName = 'formatearCompras';
  
  try {
    logInfo(functionName, 'Starting to format Compras sheet');
    
    const ss = SpreadsheetApp.openById("1bWSMhd-cFsR_0iYiiRHkr-zKU7vbqLvW-c5k-5Fxgo0");
    const sheet = ss.getSheetByName("Compras");
    
    if (!sheet) {
      throw new Error("Sheet 'Compras' not found in spreadsheet");
    }
    
    // Encabezados
    const headers = [
      "original_url","title_en","description_en","price_source","currency_source","image_urls",
      "Model","MPN","SKU","UPC","GTIN","Color","Size","Condition","Warranty","Free Shipping",
      "Shipping Cost","Available Qty","Buying Mode","Listing Type","Category","Cost USD","Cost MXN",
      "Vendor","Platform","Product URL","Images (JSON)","Attributes (JSON)","Description","Domain",
      "Status","brand","model","permalink","thumbnail_url","seller_sku","Reviews","Availability","Scraped At"
    ];
    
    // Escribir encabezados en fila 5
    sheet.getRange(5, 1, 1, headers.length).setValues([headers]);
    
    // Formato encabezados
    const range = sheet.getRange(5, 1, 1, headers.length);
    range.setFontWeight("bold");
    range.setBackground("#f4b084"); // Naranja claro
    range.setHorizontalAlignment("center");
    range.setFontSize(11);
    range.setFontColor("black");
    
    // Ajustar ancho de columnas
    sheet.setColumnWidths(1, headers.length, 180);
    
    // Congelar hasta la fila 5
    sheet.setFrozenRows(5);
    
    logInfo(functionName, 'Successfully formatted Compras sheet');
    Logger.log("✅ Encabezados aplicados en fila 5 con formato.");
    
  } catch (error) {
    logError(functionName, 'Failed to format Compras sheet', error);
    throw error;
  }
}