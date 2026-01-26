/**
 * UPSELLER ERP INTEGRATION
 * Monitors stock status from the UpSeller sheet and notifies sales.
 */

function notifyOutOfStock() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName('UpSeller');
  if (!sheet) {
    Logger.log('❌ Error: Sheet "UpSeller" not found.');
    return;
  }

  const data = sheet.getDataRange().getValues();
  if (data.length < 2) return;

  // 1. Map Headers dynamically
  const headers = data[0];
  const idxTitulo = headers.indexOf('Título');
  const idxSKU = headers.indexOf('SKU');
  const idxUPC = headers.indexOf('Código de Barras');
  const idxVendidas = headers.indexOf('Cantidad Vendida'); 
  const idxActivo = headers.indexOf('Está activa en venta');
  const idxProveedor = headers.indexOf('Enlace del Proveedor');

  const outOfStockItems = [];

  // 2. Collect items with no stock
  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    const titulo = row[idxTitulo];
    const sku = row[idxSKU];
    const upc = row[idxUPC];
    const vendidas = idxVendidas !== -1 ? (row[idxVendidas] || 0) : 'N/A';
    const activeFlag = row[idxActivo]; // 'Y' for active, 'N' or empty for inactive/no stock
    const enlaceProveedor = row[idxProveedor] || 'No disponible';

    // Condition: Not active in sale ('N' or empty)
    if (activeFlag === 'N' || activeFlag === '' || activeFlag === 0) {
      outOfStockItems.push({
        titulo, sku, upc, vendidas, enlaceProveedor
      });
    }
  }

  // 3. Send Summary Email (More efficient than individual emails)
  if (outOfStockItems.length > 0) {
    const subject = `⚠️ ALERTA: ${outOfStockItems.length} Productos sin stock (UpSeller)`;
    
    let tableRows = outOfStockItems.map(item => `
      <tr>
        <td style="padding:10px; border:1px solid #ddd;">${item.titulo}</td>
        <td style="padding:10px; border:1px solid #ddd;">${item.sku}</td>
        <td style="padding:10px; border:1px solid #ddd;">${item.upc}</td>
        <td style="padding:10px; border:1px solid #ddd;"><a href="${item.enlaceProveedor}">Ver Proveedor</a></td>
      </tr>
    `).join('');

    const htmlBody = `
      <h2 style="color: #d93025;">Reporte de Inventario Agotado</h2>
      <p>Se han detectado <b>${outOfStockItems.length}</b> productos marcados como no activos o sin stock en UpSeller.</p>
      <table style="width:100%; border-collapse: collapse; font-family: Arial, sans-serif;">
        <thead>
          <tr style="background-color: #f8f9fa;">
            <th style="padding:10px; border:1px solid #ddd; text-align:left;">Producto</th>
            <th style="padding:10px; border:1px solid #ddd; text-align:left;">SKU</th>
            <th style="padding:10px; border:1px solid #ddd; text-align:left;">UPC</th>
            <th style="padding:10px; border:1px solid #ddd; text-align:left;">Link</th>
          </tr>
        </thead>
        <tbody>
          ${tableRows}
        </tbody>
      </table>
      <p><br><i>Este es un reporte automático del Sistema de Auditoría USa.</i></p>
    `;

    MailApp.sendEmail({
      to: "ventas@mitiendota.com, diegranb@gmail.com",
      subject: subject,
      htmlBody: htmlBody
    });

    Logger.log(`✅ Reporte enviado con ${outOfStockItems.length} productos.`);
  } else {
    Logger.log('ℹ️ No se detectaron productos sin stock.');
  }
}
