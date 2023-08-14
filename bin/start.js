const cluster = require('cluster');
const http = require('http');
const clearDump = require('../server/util/clearDump');
const initApp = require('../server/server');

if (process.env.NODE_ENV === 'production') {
  if (cluster.isMaster) {
    clearDump();
  }
} else {
  clearDump();
}

const graphQLServer = initApp();
const GRAPHQL_PORT = process.env.PORT || 3000;
const IP = process.env.IP || '0.0.0.0';

// if(cluster.isMaster && process.env.NODE_ENV === 'production') {
//   const clusterController = require('../server/controllers/ClusterController').default;
//   clusterController.initCLuster();
// } else {
//
// }

http.createServer(graphQLServer).listen(GRAPHQL_PORT, IP, () => console.log(
  `GraphiQL is now running on http://localhost:${GRAPHQL_PORT}/graphiql`,
));
