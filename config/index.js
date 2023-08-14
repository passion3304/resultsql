const convict = require('./convict');
const development = require('./development.json');
const production = require('./production.json');

const env = process.env.NODE_ENV || 'development';

function emptyFunction() {}
function isConvict(value) { return function isValue(val) { return val === value; }; }

convict.addFormat({
  name: 'isProduction',
  validate: emptyFunction,
  coerce: isConvict('production'),
});

convict.addFormat({
  name: 'isDevelopment',
  validate: emptyFunction,
  coerce: isConvict('development'),
});

/* eslint-disable global-require, import/no-dynamic-require */

// eslint-disable-next-line no-console
// console.log('readFileSync', !!process.env.BROWSER);

// gets the configuration for an env
function getEnvironmentConfig(schema) {
  // eslint-disable-next-line no-console
  // console.log('getEnvironmentConfig', env, schema);
  const config = convict(schema);

  config.load(env === 'development' ? development : production);
  config.validate({ allowed: 'strict' });

  const props = config.getProperties();

  return props;
}

module.exports = getEnvironmentConfig;
