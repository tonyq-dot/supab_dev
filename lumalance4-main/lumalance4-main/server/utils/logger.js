/**
 * Logger Utility
 * 
 * A simple logging utility for the server.
 */

const config = require('../config');

// Define log levels
const LOG_LEVELS = {
  ERROR: 0,
  WARN: 1,
  INFO: 2,
  DEBUG: 3,
};

// Set current log level based on environment
const currentLogLevel = config.server.env === 'production' 
  ? LOG_LEVELS.INFO 
  : LOG_LEVELS.DEBUG;

/**
 * Format a log message with timestamp and level
 * 
 * @param {string} level - The log level
 * @param {string} message - The log message
 * @param {any} data - Additional data to log
 * @returns {string} - The formatted log message
 */
function formatLogMessage(level, message, data) {
  const timestamp = new Date().toISOString();
  let formattedMessage = `[${timestamp}] [${level}] ${message}`;
  
  if (data) {
    if (data instanceof Error) {
      formattedMessage += `\n${data.stack || data.message}`;
    } else if (typeof data === 'object') {
      try {
        formattedMessage += `\n${JSON.stringify(data, null, 2)}`;
      } catch (e) {
        formattedMessage += `\n[Object]`;
      }
    } else {
      formattedMessage += `\n${data}`;
    }
  }
  
  return formattedMessage;
}

/**
 * Log an error message
 * 
 * @param {string} message - The error message
 * @param {any} data - Additional data to log
 */
function error(message, data) {
  if (currentLogLevel >= LOG_LEVELS.ERROR) {
    console.error(formatLogMessage('ERROR', message, data));
  }
}

/**
 * Log a warning message
 * 
 * @param {string} message - The warning message
 * @param {any} data - Additional data to log
 */
function warn(message, data) {
  if (currentLogLevel >= LOG_LEVELS.WARN) {
    console.warn(formatLogMessage('WARN', message, data));
  }
}

/**
 * Log an info message
 * 
 * @param {string} message - The info message
 * @param {any} data - Additional data to log
 */
function info(message, data) {
  if (currentLogLevel >= LOG_LEVELS.INFO) {
    console.info(formatLogMessage('INFO', message, data));
  }
}

/**
 * Log a debug message
 * 
 * @param {string} message - The debug message
 * @param {any} data - Additional data to log
 */
function debug(message, data) {
  if (currentLogLevel >= LOG_LEVELS.DEBUG) {
    console.debug(formatLogMessage('DEBUG', message, data));
  }
}

module.exports = {
  error,
  warn,
  info,
  debug,
};
