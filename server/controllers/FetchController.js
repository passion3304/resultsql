const _ = require('lodash');
const request = require('request-promise');
const { writeFile, stat } = require('fs');
const { join } = require('path');
const logger = require('../util/logger');
// import cluster from 'cluster';
// import clusterController from './ClusterController';

class FetchController {
  /**
   * Initialize and cache data
   *
   * @param {Object} params
   * @param {number} params.cacheLifetime
   * @param {boolean} params.shouldStore cache data into dump file
   * @param {string} params.type data type identifier ( logs and local filenames )
   * @param {string|Object[]} params.url url
   * @param {string} params.url[].key
   * @param {string} params.url[].url
   * @returns void
   */
  constructor(params) {
    this.cacheLifetime = params.cacheLifetime;
    this.type = params.type;
    this.url = params.url;
    this.shouldStore = params.shouldStore === undefined ? true : !!params.shouldStore;
    this.cache = {};

    // modify data here before it will be saved/stored
    this.dataDecorators = [];

    _.bindAll(this, 'updateCache', 'storeCache', 'fetch');

    /*
    if (cluster.isMaster) {
      this.fetch();
    } else if (cluster.isWorker) {
      process.on('message', (message) => {
        if (message.type === this.type) {
          this.cache = message.data;
        }
      });
    }
    */
    this.fetch();

    stat(join(__dirname, `../../dumps/${this.type}Dump.json`), (err) => {
      if (err) {
        return logger.log('info', `Initializing ${this.type} dump file`);
      }
      /*eslint-disable*/
      const dump = require(`../../dumps/${this.type}Dump.json`);
      /* eslint-enable */

      logger.log('info', `${this.type} dump was initialized!`);
      return this.updateCache(dump);
    });
  }

  /**
   * set
   * set, set Cache
   * @param response response from Server
   * @returns {void}
   */
  updateCache(response) {
    if (_.isObject(response)) {
      this.cache = this.processCache(response);
    } else {
      logger.log('error', `${this.type} dump error!`);
      return;
    }
    if (this.shouldStore) {
      this.storeCache();
    }
    // clusterController.sendMessage({ type: this.type, data: this.cache });
  }

  /**
   * Store cache into dump file
   * @returns {void}
   */

  storeCache() {
    writeFile(join(__dirname, `../../dumps/${this.type}Dump.json`), JSON.stringify(this.cache), (err) => {
      if (err) {
        logger.log('error', err);
      }
      logger.log('info', `${this.type} dump was updated!`);
    });
  }
  processCache(response) {
    let result = response;
    _.forEach(this.dataDecorators, (decorator) => {
      result = decorator(this, result);
    });
    return result;
  }

  /**
   * fetch
   * fetch, fetches translation from remote API
   * @returns {*}
   */
  fetch() {
    clearTimeout(this.timeout);
    this.timeout = setTimeout(this.fetch, this.cacheLifetime);

    if (_.isArray(this.url)) {
      const promises = _.map(this.url, (requestObject) => {
        const options = {
          method: 'GET',
          uri: requestObject.url,
          json: true,
          gzip: true,
        };
        return request(options);
      });

      return Promise.all(promises).then((response) => {
        this.updateCache(_.reduce(this.url, (
          finalResponse,
          requestObject,
          index,
        ) => Object.assign(finalResponse, { [requestObject.key]: response[index] }), {}));
      })
        .catch((err) => {
          console.log(err);
          logger.log('error', `FETCH ${this.type} Error: ', ${JSON.stringify(err.message)}`);
        });
    }

    const options = {
      method: 'GET',
      uri: this.url,
      json: true,
      gzip: true,
    };
    return request(options).then(this.updateCache)
      .catch((err) => {
        console.log(err);
        logger.log('error', `FETCH ${this.type} Error: ', ${JSON.stringify(err.message)}`);
      });
  }
}

module.exports = FetchController;
