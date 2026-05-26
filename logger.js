const winston = require("winston");
require("winston-daily-rotate-file");

const transport = new winston.transports.DailyRotateFile({
  filename: "logs/%DATE%.log",
  datePattern: "YYYY-MM-DD",
  zippedArchive: true,
  maxSize: "20m",
  maxFiles: "14d"
});

const logger = winston.createLogger({
  level: "info",
  format: winston.format.combine(
    winston.format.printf(({ message }) => {
      return message;
    })
  ),
  transports: [
    transport,
    new winston.transports.Console()
  ]
});

module.exports = logger;