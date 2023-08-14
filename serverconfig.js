const getEnvironmentConfig = require('./config');
const schema = require('./config/server.schema');

module.exports = getEnvironmentConfig(schema);
