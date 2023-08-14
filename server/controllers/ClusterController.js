const os = require('os');
const _ = require('lodash');
const cluster = require('cluster');
const logger = require('../util/logger');

class ClusterController {
  constructor() {
    this.workers = [];
    _.bindAll(this, 'initCluster', 'forkWorker', 'sendMessage');
  }

  initCluster() {
    const numWorkers = process.env.workers || os.cpus().length;
    logger.log('info', `Master cluster setting up ${numWorkers} workers...`);

    for (let i = 0; i < numWorkers; i++) {
      this.workers.push(cluster.fork());
    }

    cluster.on('online', (worker) => {
      logger.log('info', `Worker ${worker.process.pid}  is online`);
    });

    cluster.on('exit', this.forkWorker);
  }

  /**
   * forkWorker
   * forkWorker, create one more worker after exit signal
   * @param worker
   * @param code
   * @param signal
   */
  forkWorker(worker, code, signal) {
    this.workers = this.workers.filter((oldWorker) => oldWorker.id !== worker.id);
    logger.log('info', `Worker ${worker.process.pid} died with code: ${code}, and signal: ${signal}`);
    this.workers.push(cluster.fork());
  }

  /**
   * sendMessage
   * sendMessage, send message to all workers
   * @param  {Object} message  should be
   */
  sendMessage(message) {
    Object.keys(cluster.workers).forEach((id) => {
      cluster.workers[id].send(message);
    });
  }
}

module.exports = new ClusterController();
