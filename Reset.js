/**
 * ELIMINACIÓN TOTAL DE TRIGGERS
 * Borra absolutamente todos los disparadores del proyecto.
 * Útil para detener procesos infinitos o limpiar duplicados.
 */
function killAllTriggers() {
  const props = PropertiesService.getScriptProperties();
  const triggers = ScriptApp.getProjectTriggers();
  const count = triggers.length;
  
  Logger.log(`🛑 Iniciando limpieza de ${count} triggers...`);
  
  triggers.forEach(trigger => {
    try {
      ScriptApp.deleteTrigger(trigger);
    } catch (e) {
      Logger.log(`⚠️ No se pudo borrar un trigger: ${e.toString()}`);
    }
  });

  // LIMPIEZA DE ESTADO: Borramos los IDs de rastreo para que no pueda continuar solo
  props.deleteProperty('SCROLL_ID');
  props.deleteProperty('AUDIT_OFFSET');
  
  Logger.log('✅ Triggers eliminados y estado de auditoría reseteado.');
  
  try {
    SpreadsheetApp.getUi().alert(`✅ Paro de Emergencia Completado.\n\nSe eliminaron ${count} disparadores y se borró el progreso actual.`);
  } catch (e) {}
}

/**
 * REINICIO DEL SISTEMA
 * Detiene todos los procesos y comienza la sincronización desde cero.
 */

function restartSystem() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const props = PropertiesService.getScriptProperties();

  let useUi = true;
  let ui;

  try {
    ui = SpreadsheetApp.getUi();
  } catch (e) {
    useUi = false; 
  }

  if (useUi) {
    const result = ui.alert(
      '⚠️ REINICIO COMPLETO',
      'Esto borrará todo el progreso y comenzará una nueva auditoría.\n¿Estás seguro?',
      ui.ButtonSet.YES_NO
    );
    if (result !== ui.Button.YES) return;
  }

  // 1. Eliminar triggers
  const triggers = ScriptApp.getProjectTriggers();
  triggers.forEach(trigger => {
    if (trigger.getHandlerFunction() === 'fullInventoryAudit') {
      ScriptApp.deleteTrigger(trigger);
    }
  });

  // 2. Resetear propiedades
  props.deleteProperty('SCROLL_ID'); // We use SCROLL_ID now, not OFFSET
  props.deleteProperty('AUDIT_OFFSET'); 

  // 3. Re-inicializar hojas críticas
  setupSnapshotInventario(ss); 
  
  // Asegurar que existe la hoja de logs crudos
  if (!ss.getSheetByName('RAW_Webhook_Log')) {
    ss.insertSheet('RAW_Webhook_Log');
  }
  setupRawWebhookLog(ss); 

  Logger.log('🚀 Restarting Audit...');
  updateDashboardStatus('Iniciando Sincronización Completa...');
  
  fullInventoryAudit();

  if (useUi) {
    ui.alert('✅ Sistema Reiniciado.\n\nLa sincronización ha comenzado con las nuevas columnas (GTIN, Tiempo Fabricación).');
  }
}