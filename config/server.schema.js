/**
 * node-convict schema for pow.
 *
 * https://github.com/mozilla/node-convict
 */
module.exports = {
  // Configurations that affects building
  env: {
    doc: 'Deployment environment',
    arg: 'env',
    env: 'NODE_ENV',
    default: 'development',
    format: String,
  },

  isProduction: {
    doc:
      'Enables production performance tweaks and disables debugs, independent of the environment',
    arg: 'isProduction',
    env: 'NODE_ENV',
    default: false,
    format: 'isProduction',
  },

  isDevelopment: {
    doc: 'Enables development',
    arg: 'isDevelopment',
    env: 'NODE_ENV',
    default: true,
    format: 'isDevelopment',
  },

  port: {
    doc: 'port',
    arg: 'port',
    env: 'PORT',
    default: '9443',
    format: 'port',
  },

  // Run-time configuration

  // api endpoints
  apiUrl: {
    doc: '',
    arg: 'apiUrl',
    env: 'SPORT_CATEGORIES_API',
    default: 'https://json.spbk.bet',
    format: String,
  },

  eventDumpUrl: {
    doc: 'Eventservice uri to events api endpoint',
    arg: 'eventDumpUrl',
    env: 'EVENT_DUMP_URL',
    default: 'https://eventservice.spbk.bet/{{LANG}}',
    format: String,
  },

  categoryDataUrl: {
    doc: 'Category weights, longterm/live',
    arg: 'categoryDataUrl',
    env: 'CATEGORY_DATA_URL',
    default: 'https://api2.tb.exxs.net',
    format: String,
  },

  resultApiUrl: {
    doc: 'Results url',
    arg: 'resultApiUrl',
    env: 'RESULTS_URL',
    default: 'https://betprogramm-api.tb.exxs.net/feeds/results/r.json',
    format: String,
  },

  // other
  languages: {
    doc: 'allowed languages',
    arg: 'allowed_languages',
    env: 'ALLOWED_LANGUAGES',
    default: ['de', 'en'],
    format: Array,
  },

  mergedCats: {
    doc: '',
    arg: '',
    env: '',
    default: {},
    format: Object,
  },

  ignoredCats: {
    doc: '',
    arg: '',
    env: '',
    default: {},
    format: Object,
  },

  hasCategoriesCache: {
    doc: '',
    arg: 'hasCategoriesCache',
    env: 'HAS_CATEGORIES_CACHE',
    default: false,
    format: Boolean,
  },

  /*
  cacheTime: {
    doc: 'cache time as http header string',
    arg: 'cacheTime',
    env: 'CONFIG_CACHETIME',
    default: '5 minutes',
    format: String,
  },
  */
};
