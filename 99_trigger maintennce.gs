Logger.log("Loaded: 99_trigger_maintenance.gs - Trigger functions ready");

/* 
 * trigger maintenance.gs  
 *
 * This  file contains scripts to maintain the apps script triggers
 * 
 * TODO (lm102 - 2024-11-11): decide how these are executed. Buttons in the Settings sheet?
 * 
 * 2024-11-11 Lach Mullen
 

function createTriggers() {
  // first, delete all previous triggers 
  deleteAllTriggers();

  // Create the new onEdit trigger
  ScriptApp.newTrigger("onEditTrigger")
    .forSpreadsheet(SpreadsheetApp.getActiveSpreadsheet())
    .onEdit()
    .create();

  // Add an onOpen trigger for any additional setup on opening
  ScriptApp.newTrigger("onOpenTrigger")
    .forSpreadsheet(SpreadsheetApp.getActiveSpreadsheet())
    .onOpen()
    .create();

  Logger.log("Triggers created successfully.");
}

function deleteAllTriggers() {
  const triggers = ScriptApp.getProjectTriggers();
  triggers.forEach(trigger => ScriptApp.deleteTrigger(trigger));
  Logger.log("All triggers deleted.");
}*/