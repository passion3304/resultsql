const express = require('express');
const { graphqlExpress, graphiqlExpress } = require('apollo-server-express');
const bodyParser = require('body-parser');
const { makeExecutableSchema } = require('graphql-tools');
const typeDefs = require('./data/schema');
const logger = require('./util/logger');
const initResolvers = require('./data/resolvers');

const initApp = () => {
  const app = express();
  const socketClient = require('./socketClient');
  app.set('client', socketClient);

  const mockRequest = (name) => {
    // eslint-disable-next-line import/no-dynamic-require, global-require
    const m = require(name);
    // eslint-disable-next-line no-underscore-dangle
    if (m._isRequestRewrote) {
      return;
    }
    const superMethod = m.request;
    Object.assign(m, {
      _isRequestRewrote: true,
      request: (...args) => {
        const options = args.length > 2 ? args[1] : args[0];
        const protocol = options.proto || options.protocol || '';
        const host = options.host || options.hostname || 'localhost';
        const port = options.port || options.defaultPort || '';
        const prot = protocol.endsWith(':')
          ? protocol.substr(0, protocol.length - 1)
          : protocol;
        const fullUrl = args.length > 2
          ? args[0]
          : (`${options.href || options.url || (
            host
              ? `${prot}://${host}${port ? `:${port}` : ''}${options.path}`
              : options.path)}`
          );
        const data = options.body || options.data || '';
        const msg = `${fullUrl} , ${options.method}, ${data}`;
        logger.log('request', msg);
        return superMethod(...args);
      },
    });
    // eslint-disable-next-line no-console
    logger.log('info', `mockRequest: mock request for ${name} logs`);
  };

  mockRequest('http');
  mockRequest('https');

  app.use('/graphql', (req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, Content-Length, X-Requested-With');
    if (req.method === 'OPTIONS') {
      res.sendStatus(200);
    } else {
      next();
    }
  });
  const resolvers = initResolvers();
  const schema = makeExecutableSchema({ typeDefs, resolvers });
  app.use('/graphql', bodyParser.json(), graphqlExpress({ schema }));
  app.use('/graphiql', graphiqlExpress({ endpointURL: '/graphql' }));
  return app;
};

module.exports = initApp;
