const MAX_STRING_LENGTH = 200;
const MAX_ARRAY_LENGTH = 10;
const MAX_DEPTH = 3;

const SENSITIVE_KEYS = new Set([
  'password',
  'pass',
  'token',
  'authorization',
  'auth',
  'secret',
  'refreshToken',
  'accessToken',
  'newPassword',
  'oldPassword'
]);

function truncateString(value) {
  if (typeof value !== 'string') return value;
  if (value.length <= MAX_STRING_LENGTH) return value;
  return value.slice(0, MAX_STRING_LENGTH - 3) + '...';
}

function sanitizeValue(value, depth = 0) {
  if (value === null || value === undefined) {
    return value;
  }
  if (depth >= MAX_DEPTH) {
    if (Array.isArray(value)) {
      return `[Array(${value.length})]`;
    }
    if (typeof value === 'object') {
      return '[Object]';
    }
    return value;
  }

  if (typeof value === 'string') {
    return truncateString(value);
  }

  if (Array.isArray(value)) {
    if (!value.length) return [];
    const length = Math.min(value.length, MAX_ARRAY_LENGTH);
    const sanitized = [];
    for (let i = 0; i < length; i += 1) {
      sanitized.push(sanitizeValue(value[i], depth + 1));
    }
    if (value.length > length) {
      sanitized.push(`…(+${value.length - length})`);
    }
    return sanitized;
  }

  if (typeof value === 'object') {
    const output = {};
    for (const [key, val] of Object.entries(value)) {
      if (SENSITIVE_KEYS.has(key.toLowerCase())) {
        output[key] = '[REDACTED]';
        continue;
      }
      output[key] = sanitizeValue(val, depth + 1);
    }
    return output;
  }

  return value;
}

function shouldLogBody(method) {
  return !['GET', 'HEAD', 'OPTIONS'].includes(method);
}

function buildRequestMeta(req) {
  const meta = {
    requestId: req.context?.id,
    method: req.method,
    url: req.originalUrl || req.url,
    ip: req.ip,
    userAgent: req.get?.('User-Agent')
  };

  if (req.user) {
    meta.user = {
      id: req.user.id,
      username: req.user.username,
      role: req.user.role
    };
  }

  if (req.params && Object.keys(req.params).length) {
    meta.params = sanitizeValue(req.params);
  }

  if (req.query && Object.keys(req.query).length) {
    meta.query = sanitizeValue(req.query);
  }

  if (shouldLogBody(req.method) && req.body && Object.keys(req.body).length) {
    meta.body = sanitizeValue(req.body);
  }

  return meta;
}

function buildErrorMeta(err, req, overrides = {}) {
  const meta = {
    ...buildRequestMeta(req),
    name: err.name,
    message: err.message,
    stack: err.stack,
    code: err.code,
    details: sanitizeValue(err.details),
    ...overrides
  };

  return meta;
}

module.exports = {
  sanitizeValue,
  buildRequestMeta,
  buildErrorMeta
};
