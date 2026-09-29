/* eslint-disable no-unused-vars */
export function errorHandler(err, req, res, next) {
    console.error('[error]', err);
    const code = err.status || 500;
    res.status(code).json({ error: err.message || 'Server error' });
  }
  