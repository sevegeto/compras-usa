/**
 * WEEKLY EXECUTIVE REPORT
 * Sends a summary of inventory health, financials, and alerts every Monday.
 */

function scheduleWeeklyReport() {
  // Clear existing triggers for this function to avoid duplicates
  const triggers = ScriptApp.getProjectTriggers();
  triggers.forEach(trigger => {
    if (trigger.getHandlerFunction() === 'sendWeeklyReport') {
      ScriptApp.deleteTrigger(trigger);
    }
  });

  // Schedule for every Monday at 8:00 AM
  ScriptApp.newTrigger('sendWeeklyReport')
    .timeBased()
    .everyWeeks(1)
    .onWeekDay(ScriptApp.WeekDay.MONDAY)
    .atHour(8)
    .create();

  Logger.log('✅ Reporte Semanal programado para los lunes a las 8 AM.');
  SpreadsheetApp.getUi().alert('✅ Reporte Semanal activado (Lunes 8:00 AM).');
}

function sendWeeklyReport() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const dashboard = ss.getSheetByName('Dashboard');
  const snapshot = ss.getSheetByName('Snapshot_Inventario');
  const props = PropertiesService.getScriptProperties();
  const email = props.getProperty('REPORT_EMAIL') || Session.getActiveUser().getEmail();

  // 1. Gather Metrics
  const totalItems = dashboard.getRange('B5').getValue();
  const zeroDays = dashboard.getRange('B7').getValue();
  
  // Financials (Assuming they are calculated in rows 13-16 approx, or hardcoded position from Financials.js)
  // Let's re-calculate fresh financials to be sure
  updateFinancials(); // From Financials.js
  
  // Read Financials from Dashboard (Row 13 onwards usually)
  // Search for the header row
  const data = dashboard.getDataRange().getValues();
  let finRow = -1;
  for(let i=0; i<data.length; i++) {
    if(data[i][0] === '💰 FINANCIAL METRICS') {
      finRow = i;
      break;
    }
  }

  let retailVal = '$0.00';
  let costVal = '$0.00';
  let profit = '$0.00';

  if (finRow !== -1) {
    retailVal = dashboard.getRange(finRow + 2, 2).getDisplayValue(); // Row + 2 because header is Row
    costVal = dashboard.getRange(finRow + 3, 2).getDisplayValue();
    profit = dashboard.getRange(finRow + 4, 2).getDisplayValue();
  }

  // 2. Build Email
  const subject = `📈 Reporte Semanal de Inventario - ${Utilities.formatDate(new Date(), 'America/Mexico_City', 'dd/MM/yyyy')}`;
  
  const htmlBody = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e0e0e0; border-radius: 8px; overflow: hidden;">
      <div style="background-color: #4285F4; color: white; padding: 20px; text-align: center;">
        <h2 style="margin: 0;">Resumen Semanal de Inventario</h2>
        <p style="margin: 5px 0 0;">${Utilities.formatDate(new Date(), 'America/Mexico_City', 'dd MMMM yyyy')}</p>
      </div>
      
      <div style="padding: 20px;">
        <h3 style="color: #333; border-bottom: 2px solid #4285F4; padding-bottom: 5px;">📊 Estado del Inventario</h3>
        <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
          <tr>
            <td style="padding: 10px; border-bottom: 1px solid #eee;">Total Productos:</td>
            <td style="padding: 10px; border-bottom: 1px solid #eee; font-weight: bold; text-align: right;">${totalItems}</td>
          </tr>
          <tr>
            <td style="padding: 10px; border-bottom: 1px solid #eee;">Riesgo (0 días fabr.):</td>
            <td style="padding: 10px; border-bottom: 1px solid #eee; font-weight: bold; text-align: right; color: ${zeroDays > 0 ? 'red' : 'green'};">${zeroDays}</td>
          </tr>
        </table>

        <h3 style="color: #333; border-bottom: 2px solid #34A853; padding-bottom: 5px;">💰 Resumen Financiero</h3>
        <table style="width: 100%; border-collapse: collapse;">
          <tr>
            <td style="padding: 10px; border-bottom: 1px solid #eee;">Valor Venta (Retail):</td>
            <td style="padding: 10px; border-bottom: 1px solid #eee; font-weight: bold; text-align: right;">${retailVal}</td>
          </tr>
          <tr>
            <td style="padding: 10px; border-bottom: 1px solid #eee;">Costo Inventario:</td>
            <td style="padding: 10px; border-bottom: 1px solid #eee; font-weight: bold; text-align: right;">${costVal}</td>
          </tr>
          <tr style="background-color: #f8f9fa;">
            <td style="padding: 10px; font-weight: bold;">Beneficio Potencial:</td>
            <td style="padding: 10px; font-weight: bold; text-align: right; color: green;">${profit}</td>
          </tr>
        </table>
        
        <div style="margin-top: 30px; text-align: center;">
          <a href="${ss.getUrl()}" style="background-color: #4285F4; color: white; padding: 12px 20px; text-decoration: none; border-radius: 5px; font-weight: bold;">Ver Dashboard Completo</a>
        </div>
      </div>
      
      <div style="background-color: #f1f3f4; padding: 10px; text-align: center; font-size: 12px; color: #666;">
        Reporte generado automáticamente por tu Sistema de Auditoría ML.
      </div>
    </div>
  `;

  MailApp.sendEmail({
    to: email,
    subject: subject,
    htmlBody: htmlBody
  });
  
  Logger.log('📧 Reporte semanal enviado a: ' + email);
}
