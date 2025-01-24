Logger.log("Loaded: 02_main_workflow.gs - Main workflow functions ready");

/**
 * mainWorkflow - The primary function controlling the event entry process.
 * 
 * This function runs in a continuous loop to handle the entry validation and screening process 
 * for event attendees. It logs all critical stages, handles cancellations, and manages entry approval 
 * or denial based on user inputs. The workflow is designed to handle various scenarios while ensuring 
 * the log captures all significant events.
 * 
 * Workflow Steps:
 * 
 * 1. **Fetch Entry ID**:
 *    - Retrieves an entry ID from the designated cell or prompts the user if the cell is empty.
 *    - If canceled, logs the cancellation and exits the workflow.
 *    - If no valid ID is provided, the workflow restarts.
 * 
 * 2. **Validate and Parse the Entry ID**:
 *    - Parses the entry ID using the `getID()` function.
 *    - If the ID is invalid, displays an error, logs the issue, and restarts the workflow.
 * 
 * 3. **Generate a Hash ID**:
 *    - Converts the validated entry ID into an MD5 hash for further processing.
 *    - If hash generation fails, logs the failure and exits the workflow.
 *    - Logs the start of processing for a valid hash ID.
 * 
 * 4. **Check Registration Status**:
 *    - Verifies if the parsed ID exists in the registered student list.
 *    - If not found, denies entry, logs the reason, and restarts the workflow.
 * 
 * 5. **Check for Duplicate Entries**:
 *    - Checks if the hash ID has already been logged as entered.
 *    - If a duplicate is detected, notifies the user, logs the issue, and restarts the workflow.
 * 
 * 6. **Re-entry Check**:
 *    - Checks if the attendee is re-entering the event using the hash ID.
 *    - If re-entry is detected, displays a warning and logs the occurrence.
 * 
 * 7. **Screening Questions**:
 *    - Asks a series of screening questions to determine if the attendee is allowed entry.
 *    - If the user cancels during screening, logs the cancellation and exits the workflow.
 *    - If the attendee fails the screening, initiates secondary screening, logs it, and restarts the workflow.
 * 
 * 8. **Approve Entry**:
 *    - If all checks pass, approves entry, logs the approval, and restarts the workflow.
 * 
 * Logging:
 * - Uses `logStart()` to record the start of the process for each attendee.
 * - Uses `logEnd()` to record the end of the process with specific reasons (e.g., approval, cancellation).
 * 
 * Dependencies:
 * - `setConst()`: Loads configuration values.
 * - `getOrPromptForID()`: Fetches or prompts for an entry ID.
 * - `getID()`: Parses the entry ID.
 * - `checkRegisteredStudent()`: Checks if the student is registered.
 * - `hasDuplicateEntry()`: Checks for duplicate entries.
 * - `generateMD5Hash()`: Converts the ID to a hash representation for re-entry tracking.
 * - `isReEntering()`: Checks if the hash ID indicates re-entry.
 * - `askScreeningQuestions()`: Handles the screening process.
 * - `showUI()`: Displays status messages and alerts.
 * - `logStart()`, `logEnd()`, `logEntry()`: Handles logging of each entry attempt.
 * - `clearFields()`: Clears input and status cells in the sheet.
 */


function mainWorkflow() {
  setConst(); // Ensure config is loaded

  while (true) {
    Logger.log("Step 1: Fetching entry ID...");
    let entryID = getOrPromptForID();

    // Handle cancellation
    if (entryID === "cancel") {
      Logger.log("User canceled. Exiting workflow.");
      logEnd("N/A", "Canceled");
      return; // Exit the loop if canceled
    } else if (!entryID) {
      Logger.log("No valid ID entered. Restarting workflow.");
      continue; // Restart if no ID provided
    }

    // Log the entry as soon as we get a valid ID
    Logger.log(`Step 2: Parsing and validating the entry ID: ${entryID}`);
    let parsedID = getID(entryID);
    if (!parsedID) {
      Logger.log("Couldn't get parsedID. Invalid ID format?");
      showUI("INVALID_ID");
      logEnd("N/A", "Invalid ID");
      continue;
    }

    // Generate hashID before logging
    let hashID = generateMD5Hash(parsedID);
    if (!hashID) {
      Logger.log("Failed to generate hashID.");
      logEnd(parsedID, "Hash Generation Failed");
      return;
    }

    Logger.log(`Hash ID generated: ${hashID}`);
    logStart(hashID, "Manual entry or scanned"); // Log start using hashID

    Logger.log("Step 3: Checking if the student is registered...");
    if (!checkRegisteredStudent(parsedID)) {
      Logger.log("Student not found in the registered list.");
      showUI("ENTRY_DENIED");
      logEnd(hashID, "Entry Denied");
      clearFields();
      continue;
    }

    Logger.log("Step 4: Checking for duplicate entries...");
    if (hasDuplicateEntry(hashID)) {
      Logger.log(`Duplicate entry detected for ID: ${hashID}`);
      showUI("DUPLICATE_ENTRY");
      clearFields();
      logEnd(hashID, "Duplicate Entry");
      continue;
    }


    Logger.log("Step 6: Checking for re-entry...");
    if (isReEntering(hashID)) {
      Logger.log(`Re-entry detected for ID: ${hashID}`);
      
      if (config.REENTRY === "NO") {
        Logger.log("Re-entry denied due to configuration setting.");
        showUI("REENTRY_DENIED");
        logEnd(hashID, "Reentry Denied");
        clearFields();
        continue; // Restart the workflow loop
      }

      Logger.log("Re-entry allowed.");
      showUI("REENTRY_WARNING");
      logEntry(hashID, "Re-entry Allowed");
    } else {
      Logger.log(`New entry detected for ID: ${hashID}`);
      logEntry(hashID, "New Entry");
      }
/* Logger.log("Step 6: Checking for re-entry...");
    if (isReEntering(hashID)) {
      Logger.log(`Re-entry detected for ID: ${hashID}`);
      showUI("REENTRY_WARNING");
      logEnd(hashID, "Re-entry Allowed");
    }*/

    Logger.log("Step 7: Starting screening questions...");
    let screeningPassed = askScreeningQuestions(hashID);
    if (screeningPassed === "cancel") {
      Logger.log("User canceled during screening questions. Exiting workflow.");
      logEnd(hashID, "Screening Cancelled");
      return;
    } else if (!screeningPassed) {
      //Logger.log("Secondary screening required.");
      //showUI("SECONDARY_SCREENING");
      logEnd(hashID, "Secondary Screening");
      clearFields();
      continue;
    }

    Logger.log("Step 8: Entry Approved. Restarting workflow...");
    //showUI("APPROVED");
    logEntry(hashID, "APPROVED");
    logEnd(hashID, "Approved"); // Log end on approval
    clearFields(); // Clear fields after approval
  }
}