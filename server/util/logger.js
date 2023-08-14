const winston = require('winston');

const { format: filterFormat, transports } = winston;
const LEVEL = Symbol.for('level');
const isDev = process.env.NODE_ENV === 'development';
const filterOnly = (level) => filterFormat((info) => {
  if (info[LEVEL] === level) {
    return info;
  }
  return null;
})();

const devTransports = [
  new transports.File({
    name: 'warn',
    filename: 'logs/warn.log',
    level: 'warn',
  }),
  new transports.File({
    name: 'info',
    filename: 'logs/info.log',
    level: 'info',
  }),
  new transports.File({
    name: 'error',
    filename: 'logs/error.log',
    level: 'error',
  }),
  new transports.File({
    name: 'debug',
    filename: 'logs/debug.log',
    level: 'debug',
  }),
  new transports.File({
    name: 'combined',
    filename: 'logs/combined.log',
    handleExceptions: true,
  }),
  new transports.File({
    name: 'request',
    filename: 'logs/request.log',
    level: 'request',
    format: filterOnly('request'),
  }),
  !process.env.TEST && new transports.Console({
    level: 'silly',
    handleExceptions: true,
    colorize: true,
  }),
].filter((x) => !!x);

const envTransports = isDev ? devTransports : [
  new transports.File({
    name: 'combined',
    filename: 'logs/combined.log',
    handleExceptions: true,
  }),
  new transports.File({
    name: 'error',
    filename: 'logs/error.log',
    level: 'error',
  }),
  new transports.File({
    name: 'request',
    filename: 'logs/request.log',
    level: 'request',
    format: filterOnly('request'),
  }),
];

const format = !isDev ? filterFormat.combine(
  filterFormat.timestamp({ format: 'MM-DD HH:mm:ss.' }),
  filterFormat.printf((info) => `${info.timestamp} ${info.level}: ${info.message}`),
) : filterFormat.combine(
  filterFormat.colorize(),
  filterFormat.splat(),
  filterFormat.timestamp({ format: 'MM-DD HH:mm:ss.' }),
  filterFormat.simple(),
  filterFormat.printf((info) => `${info.timestamp} ${info.level}: ${info.message}`),
);

winston.addColors({ api: 'green', json: 'green', request: 'green' });

const logger = winston.createLogger({
  levels: {
    error: 0, warn: 1, info: 2, verbose: 3, debug: 4, silly: 5, api: 6, json: 7, request: 8,
  },
  format,
  transports: envTransports,
});

// eslint-disable-next-line no-console
logger.on('error', (error) => console.error('logger:error', error));

module.exports = logger;
