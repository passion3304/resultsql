const socketClusterClient = require('socketcluster-client');
const _ = require('lodash');
const request = require('request-promise');
const cluster = require('cluster');
const { parseSocketUpdates } = require('./util/helpers');
const logger = require('./util/logger');
const SportCategoriesController = require('./controllers/SportCategoriesController');
const ResultController = require('./controllers/ResultController');
const config = require('../serverconfig');

const { categoryDataUrl } = config;

let socketClient = {};

/**
 * fetchEndedEvents
 * fetching ended events by id
 * @param id
 * @returns {*|Promise<T>}
 */
const fetchEndedEvents = (id) => request({
  method: 'GET',
  uri: `${categoryDataUrl}/events/de/${id}`,
  gzip: true,
})
  .catch((e) => {
    logger.log('error', `Fetch ended events error ${new Date()} ${e.message}`);
  });

if (cluster.isMaster) {
  const scores = {};
  socketClient = socketClusterClient.connect({
    hostname: 'socketcluster-spbk.tb.exxs.net',
    port: 443,
    autoReconnect: true,
    secure: true,
  });
  socketClient.on('message', (message) => {
    if (message.indexOf('event') >= 0) {
      const { data } = JSON.parse(message);
      if (data) {
        const { uTimer, uScore } = parseSocketUpdates(data);
        if (uTimer && uTimer.length) {
          _.each(uTimer, (update) => {
            if (update.data.eid && update.data.running && update.data.period_id === '1H' && update.data.elapsed < 100) {
              SportCategoriesController.processLiveCounters(update);
              ResultController.processLiveCounters(update);
            }

            if (update.data.eid && update.data.period_id === 'FINISHED') {
              logger.log('info', `event service uTimer: ${update.data.eid}, ${JSON.stringify(update.data)}`);
              fetchEndedEvents(update.data.eid).then((responseEnded) => {
                if (!scores[update.data.eid]) {
                  logger.log('error', `event with no score: ${update.data.eid}`);
                }
                SportCategoriesController.processFinishedEvents(responseEnded, scores[update.data.eid]);
                ResultController.processFinishedEvents(responseEnded, scores[update.data.eid]);
                delete scores[update.data.eid];
              });
            }
          });
        }
        if (uScore && uScore.length) {
          _.each(uScore, (update) => {
            if (update.data.eid) {
              scores[update.data.eid] = update.data;
            }
          });
        }
      }
    }
    return null;
  });
  socketClient.on('connect', () => {
    logger.log('info', `Open socket connection ${new Date()}`);
  });

  socketClient.on('error', (err) => {
    logger.log('error', `Socket connection error ${new Date()} ${JSON.stringify(err && err.response)}`);
  });

  socketClient.on('disconnect', () => {
    logger.log('info', `Close socket connection ${new Date()}`);
  });
}

module.exports = {
  socketClient,
};
