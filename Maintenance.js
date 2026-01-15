/**
 * Programar Mantenimiento Automático (Limpieza mensual)
 */
function scheduleMaintenance() {
  const triggers = ScriptApp.getProjectTriggers();
  triggers.forEach(trigger => {
    if (trigger.getHandlerFunction() === 'runMonthlyMaintenance') {
      ScriptApp.deleteTrigger(trigger);
    }
  });

  // Ejecutar el día 1 de cada mes a las 2 AM
  ScriptApp.newTrigger('runMonthlyMaintenance')
    .timeBased()
    .onMonthDay(1)
    .atHour(2)
    .create();

  Logger.log('✅ Mantenimiento mensual programado.');
}

function runMonthlyMaintenance() {
  Logger.log('🧹 Iniciando mantenimiento mensual...');
  
  // Limpiar logs mayores a 90 días
  archiveOldLogs(90);
  
  // También podríamos refrescar métricas o enviar un informe de salud del sistema
}
