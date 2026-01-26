/**
 * ERROR HANDLING & EXECUTION TIME TRACKING
 * Centralized utilities for robust error handling and timeout management
 */

const ERROR_CONFIG = {
  MAX_EXECUTION_TIME_MS: 270000, // 4.5 minutes (Google Apps Script limit is 6 min)
  LOG_TO_SHEET: true,
  LOG_SHEET_NAME: 'Logs',
  MAX_LOG_ROWS: 10000
};

let executionStartTime = null;

/**
 * Starts execution time tracking
 */
function startExecutionTimer() {
  executionStartTime = Date.now();
}

/**
 * Gets remaining execution time in milliseconds
 * @returns {number} Remaining time in ms
 */
function getRemainingExecutionTime() {
  if (!executionStartTime) return ERROR_CONFIG.MAX_EXECUTION_TIME_MS;
  return ERROR_CONFIG.MAX_EXECUTION_TIME_MS - (Date.now() - executionStartTime);
}

/**
 * Checks if there's enough time to continue execution
 * @param {number} bufferMs - Safety buffer in milliseconds (default 30s)
 * @returns {boolean} True if safe to continue
 */
function hasTimeRemaining(bufferMs = 30000) {
  return getRemainingExecutionTime() > bufferMs;
}

/**
 * Throws error if time is running out
 * @param {string} context - Context message for error
 */
function checkTimeout(context = '') {
  if (!hasTimeRemaining()) {
    throw new TimeoutError(`Execution timeout approaching: ${context}`);
  }
}

/**
 * Custom timeout error class
 */
class TimeoutError extends Error {
  constructor(message) {
    super(message);
    this.name = 'TimeoutError';
  }
}

/**
 * Safely gets a sheet with null check and error handling
 * @param {string} sheetName - Name of the sheet
 * @param {boolean} createIfMissing - Create sheet if it doesn't exist
 * @returns {Sheet|null} Sheet object or null
 */
function safeGetSheet(sheetName, createIfMissing = false) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    let sheet = ss.getSheetByName(sheetName);
    
    if (!sheet && createIfMissing) {
      Logger.log(`📄 Creating missing sheet: ${sheetName}`);
      sheet = ss.insertSheet(sheetName);
    }
    
    if (!sheet) {
      Logger.log(`⚠️ Sheet not found: ${sheetName}`);
    }
    
    return sheet;
  } catch (error) {
    logError('safeGetSheet', `Failed to get sheet: ${sheetName}`, error);
    return null;
  }
}

/**
 * Safely writes data to sheet with batching for atomicity
 * @param {string} sheetName - Target sheet name
 * @param {number} startRow - Starting row (1-indexed)
 * @param {number} startCol - Starting column (1-indexed)
 * @param {Array<Array>} data - 2D array of data
 * @returns {boolean} Success status
 */
function safeWriteToSheet(sheetName, startRow, startCol, data) {
  if (!data || data.length === 0) {
    Logger.log('⚠️ No data to write');
    return false;
  }
  
  try {
    const sheet = safeGetSheet(sheetName);
    if (!sheet) {
      throw new Error(`Sheet not found: ${sheetName}`);
    }
    
    const numRows = data.length;
    const numCols = data[0].length;
    
    // Atomic write - single setValues call
    sheet.getRange(startRow, startCol, numRows, numCols).setValues(data);
    
    return true;
  } catch (error) {
    logError('safeWriteToSheet', `Failed to write to ${sheetName}`, error);
    return false;
  }
}

/**
 * Executes a function with comprehensive error handling
 * @param {Function} fn - Function to execute
 * @param {string} context - Context/name of operation
 * @param {Object} options - Options { onError, retries, retryDelay }
 * @returns {*} Function result or null on error
 */
function executeWithErrorHandling(fn, context, options = {}) {
  const {
    onError = null,
    retries = 0,
    retryDelay = 1000
  } = options;
  
  let lastError = null;
  
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      if (attempt > 0) {
        Logger.log(`🔄 Retry attempt ${attempt} for: ${context}`);
        Utilities.sleep(retryDelay * attempt);
      }
      
      return fn();
      
    } catch (error) {
      lastError = error;
      
      // Don't retry on timeout errors
      if (error instanceof TimeoutError) {
        logError(context, 'Timeout error - not retrying', error);
        break;
      }
      
      if (attempt === retries) {
        logError(context, `Failed after ${retries + 1} attempts`, error);
      }
    }
  }
  
  // Execute error callback if provided
  if (onError && typeof onError === 'function') {
    try {
      onError(lastError);
    } catch (callbackError) {
      Logger.log(`❌ Error in error callback: ${callbackError.message}`);
    }
  }
  
  return null;
}

/**
 * Logs error to both Logger and optional sheet
 * @param {string} context - Function/context name
 * @param {string} message - Error message
 * @param {Error} error - Error object
 */
function logError(context, message, error) {
  const timestamp = new Date().toISOString();
  const errorMsg = error?.message || String(error);
  const stack = error?.stack || '';
  
  const logEntry = `❌ [${timestamp}] ${context}: ${message} - ${errorMsg}`;
  Logger.log(logEntry);
  
  if (ERROR_CONFIG.LOG_TO_SHEET) {
    try {
      const sheet = safeGetSheet(ERROR_CONFIG.LOG_SHEET_NAME, true);
      if (sheet) {
        // Initialize headers if empty
        if (sheet.getLastRow() === 0) {
          sheet.appendRow(['Timestamp', 'Level', 'Context', 'Message', 'Details']);
          sheet.getRange(1, 1, 1, 5).setFontWeight('bold').setBackground('#f4cccc');
        }
        
        // Append error log
        sheet.appendRow([
          timestamp,
          'ERROR',
          context,
          message,
          errorMsg + (stack ? '\n' + stack.substring(0, 500) : '')
        ]);
        
        // Trim old logs if exceeds max
        const numRows = sheet.getLastRow();
        if (numRows > ERROR_CONFIG.MAX_LOG_ROWS) {
          sheet.deleteRows(2, numRows - ERROR_CONFIG.MAX_LOG_ROWS);
        }
      }
    } catch (logError) {
      // Fail silently to avoid recursive errors
      Logger.log(`Failed to log to sheet: ${logError.message}`);
    }
  }
}

/**
 * Logs info message to sheet
 * @param {string} context - Context name
 * @param {string} message - Info message
 */
function logInfo(context, message) {
  const timestamp = new Date().toISOString();
  Logger.log(`ℹ️ [${timestamp}] ${context}: ${message}`);
  
  if (ERROR_CONFIG.LOG_TO_SHEET) {
    try {
      const sheet = safeGetSheet(ERROR_CONFIG.LOG_SHEET_NAME, true);
      if (sheet) {
        if (sheet.getLastRow() === 0) {
          sheet.appendRow(['Timestamp', 'Level', 'Context', 'Message', 'Details']);
          sheet.getRange(1, 1, 1, 5).setFontWeight('bold').setBackground('#d9ead3');
        }
        sheet.appendRow([timestamp, 'INFO', context, message, '']);
      }
    } catch (error) {
      Logger.log(`Failed to log info: ${error.message}`);
    }
  }
}

/**
 * Validates required properties exist
 * @param {Array<string>} propertyNames - Array of property names to check
 * @returns {Object} { valid: boolean, missing: string[] }
 */
function validateRequiredProperties(propertyNames) {
  const props = PropertiesService.getScriptProperties();
  const missing = [];
  
  propertyNames.forEach(name => {
    const value = props.getProperty(name);
    if (!value) {
      missing.push(name);
    }
  });
  
  return {
    valid: missing.length === 0,
    missing: missing
  };
}

/**
 * Wraps a function with execution tracking and error handling
 * Use this for main entry points (menu functions, triggers)
 * @param {Function} fn - Function to wrap
 * @param {string} functionName - Name for logging
 * @returns {Function} Wrapped function
 */
function withErrorHandling(fn, functionName) {
  return function(...args) {
    startExecutionTimer();
    logInfo(functionName, 'Started');
    
    try {
      const result = fn.apply(this, args);
      logInfo(functionName, 'Completed successfully');
      return result;
    } catch (error) {
      logError(functionName, 'Execution failed', error);
      
      // Show user-friendly error if in UI context
      try {
        const ui = SpreadsheetApp.getUi();
        ui.alert(
          'Error',
          `❌ Error in ${functionName}:\n\n${error.message}\n\nCheck Logs sheet for details.`,
          ui.ButtonSet.OK
        );
      } catch (uiError) {
        // Not in UI context, skip alert
      }
      
      throw error;
    }
  };
}
