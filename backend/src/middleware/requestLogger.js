const logger = require('../utils/logger');
const { buildRequestMeta, sanitizeValue } = require('../utils/logging');

module.exports = function requestLogger(req, res, next) {
  const start = process.hrtime.bigint();
  if (!req.context) {
    req.context = {};
  }
  req.context.startTime = start;

  const startMeta = buildRequestMeta(req);
  logger.info('request.start', startMeta);

  res.on('finish', () => {
    const diff = process.hrtime.bigint() - start;
    const durationMs = Number(diff) / 1e6;
    const endMeta = buildRequestMeta(req);
    const responseMeta = {
      ...endMeta,
      statusCode: res.statusCode,
      durationMs: Math.round(durationMs * 1000) / 1000
    };

    if (res.locals && res.locals.errorDetails) {
      responseMeta.error = sanitizeValue(res.locals.errorDetails);
    }

    logger.info('request.finish', responseMeta);
  });

  next();
};
