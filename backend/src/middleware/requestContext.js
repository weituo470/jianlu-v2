const { randomUUID } = require('crypto');

function generateRequestId() {
  if (typeof randomUUID === 'function') {
    return randomUUID();
  }
  return (Date.now().toString(36) + Math.random().toString(36).slice(2, 10)).toUpperCase();
}

module.exports = function requestContext(req, res, next) {
  const requestId = generateRequestId();
  if (!req.context) {
    req.context = {};
  }
  req.context.id = requestId;
  req.context.startTime = process.hrtime.bigint();

  res.locals.requestId = requestId;
  res.setHeader('X-Request-Id', requestId);

  next();
};
