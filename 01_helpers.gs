Logger.log("Loaded: 01_helpers.gs - Helpers functions ready");
/**
 * 
 * 01_helpers.gs tries to load before 02_main_workflow.gs to ensure that then a helper function is called,
 * it's ready to go (Google Apps Script works in mysterious ways).
 * This file contains the following functions:
 *   - setConst():                checks to see if questions, messages, and settings 
 *                                are all loaded into memory yet and loads them if they 
 *                                aren't. This way the next two scripts can run to biuild 
 *                                and cache the messages and questions and for the rest 
 *                                of script execution we don't have to reference arrays.
 *   - loadConfigFromSheet():     loads the config settings from the Settings sheet
 *   - loadQuestionsFromRange():  loads the questions from the range specified on the settings sheet
 *   - loadMessagesFromRange():   loads the messages from the range specified on the settings sheet
 *   - getOrPromptForID():        checks for an ID number in the sheet and processes it, or prompts
 *                                the user to enter an ID or string. Passes it to getID() to process
 *                                if it's a string from a mag swipe.
 *   - getID():                   Processes the ID and parses it into the right format for the script.
 *   - checkRegisteredStudent():  Check the Registered students sheet. 
 *   - hasDuplicateEntry():       Checks to see if the student ID is duplicated on the sheet. After this 
 *                                we'll shred the ID and use hashes instead.
 *   - askQuestion():             this is the framework that prompts the user with questions or warnings.
 *   - generateMD5Hash():         We'll use this to hash the student ID and use the hash for a bit more privacy.
 *   - isReEntering():            Uses the MD5 hash and checks the etry log to see if this hash has swiped 
 *                                in already. This is supposed to check to see if reentry is allowed but it's broken.
 *   - askScreeningQuestions():   Rolls through the screening questions from Settings, following logic there.
 * 
 *   - logEntry():                Drops messages in the log sheet. That's all. Finally a simple function.
 *   - logStart(), logEnd():      Loghs start and end of entry processes for for performance measuements.
 *   - showUI():                  sends messages to prompts and to the messages cell on the entry sheet.
 *   - restartWorkflow():         Starts the loop over again if needed.
 *   - clearFields():             Resets yhe sheet for the next scan.
 *   - resetConfig():             Can be run manually to reset the config values loaded from the settings tab.
 * 
 * 
 */

/**
 * Global configuration object to store settings and cached data.
 */
let config = {};
let QUESTIONS = [];
let MESSAGES = {};

/**
 * Loads settings, sheet references, questions, and messages into the config object.
 * If the config is already loaded, it skips reloading.
 */
function setConst() {
  if (Object.keys(config).length > 0) {
    Logger.log("Config already loaded.");
    return;
  }

  // Step 1: Load general settings from the "⚙️ Settings" sheet
  const isLoaded = loadConfigFromSheet();
  if (!isLoaded) {
    Logger.log("Error: Configuration could not be loaded.");
    throw new Error("Configuration load failed.");
  } else {
    Logger.log("Configuration successfully loaded.");
  }

  // Step 2: Cache frequently used sheets
  Logger.log("Caching sheet references...");
  config.sheetSettings = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("⚙️ Settings");
  config.sheetPartyEntry = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(config.SHEET_PARTY_ENTRY);
  config.sheetRegistered = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(config.SHEET_REGISTERED);
  config.sheetEntryLog = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(config.SHEET_ENTRY_LOG);
  Logger.log(`Cached Entry Log Sheet: ${config.sheetEntryLog ? "Loaded" : "Not Found"}`);

    if (!config.sheetSettings) {
    Logger.log("Error: Settings sheet not found.");
    return false;
  }
  if (!config.sheetPartyEntry || !config.sheetRegistered || !config.sheetEntryLog) {
    Logger.log("Error: One or more sheets could not be found.");
    throw new Error("Sheet references failed to load.");
  }

  Logger.log("Caching sheet references complete.");


  // Step 3: Load questions and messages into global variables
  Logger.log("Loading questions and messages...");
  config.QUESTIONS = loadQuestionsFromRange(config.RANGE_QUESTIONS);
  config.MESSAGES = loadMessagesFromRange(config.RANGE_MESSAGES);
  const questionsLoaded = loadQuestionsFromRange(config.RANGE_QUESTIONS);
  const messagesLoaded = loadMessagesFromRange(config.RANGE_MESSAGES);

  // Log the contents of the questions and messages arrays for verification
  Logger.log("Final Config Loaded: " + JSON.stringify(config));
  Logger.log("Questions loaded: " + JSON.stringify(config.QUESTIONS));
  Logger.log("Messages loaded: " + JSON.stringify(config.MESSAGES));
}

Logger.log("Initializing 01_helpers.gs...");
setConst();
Logger.log("01_helpers.gs - Helpers functions ready");

/**
 * Loads settings from the "⚙️ Settings" sheet into the config object.
 * @returns {boolean} - Returns true if the configuration is loaded successfully, false otherwise.
 */
function loadConfigFromSheet() {
  const settingsSheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("⚙️ Settings");
  if (!settingsSheet) {
    Logger.log("⚙️ Settings sheet not found!");
    return false;
  }

  const settingsRange = settingsSheet.getDataRange().getValues();
  for (const [key, value] of settingsRange) {
    if (key && value) {
      config[key] = value;
    }
  }

  Logger.log("Final Config Loaded: " + JSON.stringify(config));
  return true;
}

/**
 * Loads questions from the specified range in the "⚙️ Settings" sheet.
 * The questions are stored in the global QUESTIONS array.
 * @param {string} range - The range string for the questions (e.g., "E4:J7").
 * @returns {Array} - An array of question objects.
 */
 
function loadQuestionsFromRange(range) {
  const settingsSheet = config.sheetSettings;
  if (!settingsSheet) {
    Logger.log("Error: Settings sheet not found.");
    return [];
  }

  const questionData = settingsSheet.getRange(range).getValues();
  const questions = [];

  for (let i = 0; i < questionData.length; i++) {
    const [active, title, message, type, secondaryTrigger, secondaryDetail] = questionData[i];
    
    // Ensure the row is valid and active
    if (active !== true) continue;

    // Push the question object into the array
    questions.push({
      TITLE: title,
      MESSAGE: message,
      TYPE: type,
      SECONDARY_TRIGGER: secondaryTrigger,
      SECONDARY_DETAIL: secondaryDetail,
    });

    Logger.log(`Loaded question: ${title} - ${message}`);
  }

  Logger.log(`Questions loaded: ${JSON.stringify(questions)}`);
  return questions;
}



/**
 * Loads messages from the specified range in the "⚙️ Settings" sheet.
 * The messages are stored in the global MESSAGES object.
 * @param {string} range - The range string for the messages (e.g., "A22:C29").
 * @returns {Object} - An object containing message configurations.
 */
function loadMessagesFromRange() {
  const sheet = config.sheetSettings;
  if (!sheet) {
    Logger.log("Error: Settings sheet not found when loading messages.");
    return {};
  }
  
  Logger.log(`Loading messages from range: ${config.RANGE_MESSAGES}`);
  const rangeData = sheet.getRange(config.RANGE_MESSAGES).getValues();

  if (rangeData.length === 0 || rangeData[0].length === 0) {
    Logger.log("Error: The specified range for messages is empty or invalid.");
    return {};
  }

  let messages = {};// Reset messages
  rangeData.forEach(row => {
    const [key, status, message] = row;
    if (key && status && message) {
      messages[key] = {
        STATUS: status,
        MESSAGE: message
      };
    }
  });

  Logger.log("Messages loaded successfully.");
  return messages;
}



/**
 * Fetches the entry ID from the cell or prompts the user if the cell is empty.
 * Uses `ui.prompt()` for ID entry to allow "Enter" key submission.
 * @returns {string|null} - The entered ID if provided, otherwise null if canceled.
 */
function getOrPromptForID() {
  Logger.log("Fetching entry ID from cell...");

  const sheet = config.sheetPartyEntry;
  if (!sheet) {
    Logger.log("Error: Party entry sheet not found.");
    return null;
  }

  // Step 1: Check if there's already an entry in cell C2
  let rawInput = sheet.getRange(config.CELL_ID).getValue();
  if (rawInput) {
    rawInput = rawInput.toString().trim();
    Logger.log(`Fetched input from cell ${config.CELL_ID}: ${rawInput}`);
    const entryID = getID(rawInput);
    if (entryID) {
      Logger.log("Valid ID found in cell: " + entryID);
      return entryID;
    }
  }

  // Step 2: Use `ui.prompt()` for ID entry to support "Enter" key submission
  const ui = SpreadsheetApp.getUi();
  const response = ui.prompt("Enter ID", "Please enter the student ID or scan.", ui.ButtonSet.OK_CANCEL);
  if (response.getSelectedButton() === ui.Button.CANCEL) {
    Logger.log("User canceled the prompt. Exiting workflow.");
    return "cancel";
  }

  let enteredID = response.getResponseText().trim();
  if (enteredID) {
    Logger.log("User entered ID: " + enteredID);
    const entryID = getID(enteredID);
    if (entryID) {
      Logger.log("Valid ID entered: " + entryID);
      sheet.getRange(config.CELL_ID).setValue(entryID); // Store the ID in cell C2
      return entryID;
    } else {
      Logger.log("Invalid ID format entered by user.");
      showUI("INVALID_ID");
      return null;
    }
  }

  Logger.log("No valid ID entered. Showing NO_ID message.");
  showUI("NO_ID");
  return null;
}


/**
 * Parses and validates the raw input into a 7-digit student ID.
 * @param {string} rawInput - The input string from the user.
 * @returns {string|null} - The parsed 7-digit student ID or null if invalid.
 */
function getID(rawInput) {
  const idPattern = /(?:.*=)(\d{9})/;
  //Logger.log("pattern set");

  let entryID = "";

  // Match the pattern and extract the last 7 digits
  const match = rawInput.match(idPattern);
  if (match) {
    entryID = match[1].slice(-7);
    //Logger.log("ID matches regex pattern");
  } else if (/^\d{7}$/.test(rawInput)) {
    // Check if it's already a 7-digit ID
    //Logger.log("ID passes 7-digit test");
    entryID = rawInput;
  } else {
    Logger.log("Invalid ID format: " + rawInput);
    return null;
  }

  entryID = entryID.trim();
  return entryID || null;
}


/**
 * Checks if the student is registered.
 * @param {string} entryID - The ID to check.
 * @returns {boolean} - Returns true if the ID is found, otherwise false.
 */
function checkRegisteredStudent(entryID) {
  const { SHEET_REGISTERED, RANGE_REGISTERED_IDS } = config;
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_REGISTERED);
  const cleanEntryID = entryID.trim().toUpperCase();

  const registeredIDs = sheet.getRange(RANGE_REGISTERED_IDS).getValues()
    .flat()
    .map(id => id.toString().trim().toUpperCase());

  return registeredIDs.includes(cleanEntryID);
}


/**
 * Generates an MD5 hash for a given input.
 * @param {string} input - The input string to hash.
 * @returns {string} The MD5 hash of the input.
 */
function generateMD5Hash(input) {
  const rawHash = Utilities.computeDigest(Utilities.DigestAlgorithm.MD5, input);
  let hashID = '';
  for (let i = 0; i < rawHash.length; i++) {
    const byte = (rawHash[i] + 256) % 256;
    hashID += ('0' + byte.toString(16)).slice(-2);
  }
  return hashID;
}





/**
 * Checks for duplicate entries in the registered students list.
 * @param {string} entryID - The ID to check for duplicates.
 * @returns {boolean} - Returns true if duplicates are found, otherwise false.
 */
function hasDuplicateEntry(entryID) {
  const { SHEET_REGISTERED, RANGE_REGISTERED_IDS } = config;
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_REGISTERED);
  const registeredIDs = sheet.getRange(RANGE_REGISTERED_IDS).getValues()
    .flat()
    .map(id => id.toString().trim());

  let occurrenceCount = registeredIDs.filter(id => id === entryID).length;
  let isDuplicate = occurrenceCount > 1;
  Logger.log(`Duplicate check for ID ${entryID}: ${isDuplicate} (Occurrences: ${occurrenceCount})`);
  return isDuplicate;
}

/**
 * Checks if the given hashID is already present in the entry log.
 * @param {string} hashID - The hashed ID to check.
 * @returns {boolean} - Returns true if the hashID is found in the log, otherwise false.
 */
function isReEntering(hashID) {
  const { SHEET_ENTRY_LOG, RANGE_ENTRY_IDS } = config;
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_ENTRY_LOG);
  
  if (!sheet) {
    Logger.log(`Error: Sheet "${SHEET_ENTRY_LOG}" not found.`);
    return false;
  }

  const data = sheet.getDataRange().getValues();
  
  // Extract only the IDs that are not "START" entries
  let entries = data.filter(row => row[2] !== "START").map(row => row[0]);
  
  Logger.log(`Checking re-entry for hashID: ${hashID}`);
  Logger.log(`Loaded entries: ${JSON.stringify(entries)}`);

  return entries.includes(hashID.trim());

  //TODO (lm102 2024-11-14): we need to have the array look at students who were allowed in and only block them from re-entering in case someone is bounced, sobers up, and returns (in which case they should be admitted even if reentry is not allowed).
}

/**
 * Handles asking a single screening question or prompting for ID.
 * @param {object} question - The question object containing TITLE, MESSAGE, TYPE, etc.
 * @returns {string|null} - The user's response or "cancel" if the prompt was canceled.
 */

function askQuestion(question) {
  const ui = SpreadsheetApp.getUi();
  let response;

  if (question.TYPE === "YES_NO") {
    response = ui.alert(question.TITLE, question.MESSAGE, ui.ButtonSet.YES_NO);
    return response === ui.Button.YES ? "YES" : "NO";
  } else if (question.TYPE === "OK_CANCEL") {
    // Using OK_CANCEL prompt for user input
    response = ui.prompt(question.TITLE, question.MESSAGE, ui.ButtonSet.OK_CANCEL);
    
    // If the user hits "Cancel" or closes the dialog, handle it
    if (response.getSelectedButton() === ui.Button.CANCEL) {
      return "cancel";
    }

    // Get the text response and trim it
    const userInput = response.getResponseText();
    if (userInput) {
      return userInput.trim();
    }

    return null; // No input provided
  } else {
    Logger.log(`Error: Unknown question type "${question.TYPE}"`);
    return null;
  }
}



/**
 * Handles asking screening questions and determines if secondary screening is required.
 * @param {string} entryID - The ID of the student being screened.
 * @returns {boolean} - Returns true if entry is approved; false if secondary screening is required.
 */
function askScreeningQuestions(hashID) {
  Logger.log("inside function-Step 7: Asking screening questions...");

  const questions = config.QUESTIONS;
  if (!questions || questions.length === 0) {
    Logger.log("No screening questions configured.");
    showUI("APPROVED");
    logEntry(hashID, "APPROVED");
    return true;
  }

  for (let question of questions) {
    let response = askQuestion(question);

    // Handle user cancellation
    if (response === null || response === "cancel") {
      Logger.log("User canceled during screening questions.");
      return "cancel";
    }

    // Check if the response triggers secondary screening
    if (response === question.SECONDARY_TRIGGER) {
      Logger.log(`Secondary screening triggered: ${question.SECONDARY_DETAIL}`);
      showUI("SECONDARY_SCREENING", question.SECONDARY_DETAIL);
      logEntry(hashID, question.SECONDARY_DETAIL); // Log the specific secondary detail
      return false;
    }
  }

  Logger.log("All screening questions passed.");
  return true;
}




/**
 * Displays a UI alert with a status message.
 * @param {string} key - The key to identify the message to display.
 * @param {string} [customDetail] - An optional custom detail to override the default message.
 */

  //TODO (lm102 2025-01-24): this should handle the prompt UI as well so that we can use this one script for all user interaction, which will help a lot with debugging and reduct the number of duplicate alerts.

function showUI(key, customDetail = null) {
  const messageConfig = config.MESSAGES[key];
  if (!messageConfig) {
    Logger.log(`Error: Message key "${key}" not found in configuration.`);
    return;
  }

  const { STATUS, MESSAGE } = messageConfig;
  const statusMessage = `${STATUS}—${customDetail || MESSAGE}`;

  // Update the status cell, assuming we're handling a new ID
  if (config.sheetPartyEntry) {
    config.sheetPartyEntry.getRange(config.CELL_MESSAGE).setValue(statusMessage);
    SpreadsheetApp.flush(); // Ensure the value is written before showing the UI
  }

  // Show the alert dialog
  const ui = SpreadsheetApp.getUi();
  ui.alert(STATUS, customDetail || MESSAGE, ui.ButtonSet.OK);
}





/**
 * Logs the entry to the "Entry log" sheet.
 * @param {string} hashID - The hex ID of the student.
 * @param {string} reason - The reason for the entry (approved or secondary detail).
 */
function logEntry(hashID, reason) {
  try {
    const logSheet = config.sheetEntryLog;
    if (!logSheet) {
      Logger.log("Error: Entry log sheet not found or not cached.");
      return;
    }

    // Ensure hashID and reason are not null/undefined
    if (!hashID || !reason) {
      Logger.log("Error: Missing hashID or reason for logging.");
      return;
    }

    const timestamp = new Date();
    logSheet.appendRow([hashID, timestamp, reason]);
    Logger.log(`Successfully logged entry for ID: ${hashID}, Reason: ${reason}`);
  } catch (error) {
    Logger.log(`Error logging entry: ${error.message}`);
  }
}


/**
 * Logs the start of an entry process in the "Entry log" sheet.
 * @param {string} entryID - The ID being processed.
 * @param {string} reason - Reason for starting (e.g., "Scanned", "Prompt entry").
 */
function logStart(entryID, reason) {
  const logSheet = config.sheetEntryLog;
  if (!logSheet) {
    Logger.log("Error: Entry log sheet not found.");
    return;
  }
  const timestamp = new Date();
  logSheet.appendRow([entryID, timestamp, "START", reason]);
  Logger.log(`Start logged for ID: ${entryID}, Reason: ${reason}`);
}

/**
 * Logs the end of an entry process in the "Entry log" sheet.
 * @param {string} entryID - The ID being processed.
 * @param {string} reason - Reason for ending (e.g., "Approved", "Cancelled", "Secondary Screening").
 */
function logEnd(entryID, reason) {
  const logSheet = config.sheetEntryLog;
  if (!logSheet) {
    Logger.log("Error: Entry log sheet not found.");
    return;
  }
  const timestamp = new Date();
  logSheet.appendRow([entryID, timestamp, "END", reason]);
  Logger.log(`End logged for ID: ${entryID}, Reason: ${reason}`);
}

/**
 * Restarts the workflow by clearing fields and prompting for a new entry.
 */
function restartWorkflow() {
  Logger.log("Restarting workflow...");
  clearFields(); // Ensure input and message cells are cleared

  let entryID = getOrPromptForID();
  if (!entryID) return; // Exit if the user cancels

  Logger.log("Workflow restarted with new entry ID.");
  mainWorkflow(); // Start the workflow again with the new ID
}


/**
 * Clears both the entry ID cell and the message cell.
 */
function clearFields() {
  const { SHEET_PARTY_ENTRY, CELL_ID, CELL_MESSAGE } = config;
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_PARTY_ENTRY);

  if (sheet) {
    sheet.getRange(CELL_ID).clearContent();
    sheet.getRange(CELL_MESSAGE).clearContent();
    Logger.log(`Cleared fields: ${CELL_ID} and ${CELL_MESSAGE}`);
  }
}

function resetConfig() {
  config = {};
  SHEET_PARTY_ENTRY = undefined;
  SHEET_REGISTERED = undefined;
  RANGE_QUESTIONS = undefined;
  RANGE_MESSAGES = undefined;
  Logger.log("Config and variables reset.");
}


Logger.log("Completed loading: 01_helpers.gs");