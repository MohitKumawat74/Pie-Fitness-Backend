// config/config.js
const dbConfig = require('./database');
const serverConfig = require('./server');
const secretsConfig = require('./secrets');

const config = {
  dbConfig,
  serverConfig,
  secretsConfig,
};

module.exports = config;
