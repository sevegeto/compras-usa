function fixBadSellerId() {
  const props = PropertiesService.getScriptProperties();
  const oldId = props.getProperty('SELLER_ID');
  Logger.log('❌ Current (Bad) ID: ' + oldId);
  
  // Set to the correct ID we found in diagnostics
  const correctId = '95918601'; 
  props.setProperty('SELLER_ID', correctId);
  
  Logger.log('✅ Fixed ID set to: ' + correctId);
  
  // Also reset audit offset
  props.deleteProperty('AUDIT_OFFSET');
  Logger.log('✅ Audit reset.');
}
