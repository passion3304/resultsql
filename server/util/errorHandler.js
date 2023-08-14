const errorHandler = require('express-error-handler');
const logger = require('./logger');

module.exports = (app) => [(err, req, res, next) => {
  if (err) {
    if (process.env.NODE_ENV === 'dev') {
      return next(err);
    }
    logger.log('error', err.status, {
      message: err.message,
      method: req.method,
      url: req.url,
      body: req.body,
      ip: req.ip,
    });
    return next(err);
  }
  return next();
},
errorHandler({
  server: app,
  handlers: {
    500: (err, req, res) => {
      res.status(500);
      if (err.message) {
        res.send({
          error: 500,
          message: err.message,
        });
      } else {
        res.send({
          error: 500,
          message: 'Something unexpected happened. The problem has been logged and we\'ll look into it!',
        });
      }
    },
    503: (err, req, res) => {
      res.status(503);
      res.send({
        error: 503,
        message: 'We\'re experiencing heavy load, please try again later',
      });
    },
    409: (err, req, res) => {
      res.status(409);
      if (err.message) {
        res.send({
          error: 409,
          message: err.message,
        });
      } else {
        res.send({
          error: 409,
          message: 'The specified resource already exists',
        });
      }
    },
    405: (err, req, res) => {
      res.status(405).send({
        error: 405,
        message: 'Method not allowed',
      });
    },
    404: (err, req, res) => {
      res.status(404);
      if (err.message) {
        res.send({
          error: 404,
          message: err.message,
        });
      } else {
        res.send({
          error: 404,
          message: 'Not Found',
        });
      }
    },
    401: (err, req, res) => {
      res.status(401);
      if (err.message) {
        res.send({
          error: 401,
          message: err.message,
        });
      } else {
        res.send({
          error: 401,
          message: 'Unauthorized',
        });
      }
    },
    400: (err, req, res) => {
      res.status(400);
      if (err.message) {
        res.send({
          error: 400,
          message: err.message,
        });
      } else {
        res.send({
          error: 400,
          message: 'Invalid request',
        });
      }
    },
  },
}),
];
