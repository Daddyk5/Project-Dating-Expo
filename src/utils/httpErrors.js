import createError from 'http-errors';

export const BadRequest = (msg='Bad Request') => new createError.BadRequest(msg);
export const Unauthorized = (msg='Unauthorized') => new createError.Unauthorized(msg);
export const Forbidden = (msg='Forbidden') => new createError.Forbidden(msg);
export const NotFound = (msg='Not Found') => new createError.NotFound(msg);
export const Conflict = (msg='Conflict') => new createError.Conflict(msg);
