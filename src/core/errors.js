const ERROR_CODE = {
  INVLDREQ: "INVLDREQ",
  INVLDDATA: "INVLDDATA",
  VALIDATIONERR: "VALIDATIONERR",
  NOTFOUND: "NOTFOUND",
  PERMERR: "PERMERR",
  APPERR: "APPERR",
};

const DEFAULT_STATUS_BY_CODE = {
  [ERROR_CODE.INVLDREQ]: 400,
  [ERROR_CODE.INVLDDATA]: 400,
  [ERROR_CODE.VALIDATIONERR]: 400,
  [ERROR_CODE.NOTFOUND]: 404,
  [ERROR_CODE.PERMERR]: 403,
  [ERROR_CODE.APPERR]: 500,
};

class AppError extends Error {
  constructor(message, code, statusCode, details) {
    super(message);
    this.name = "AppError";
    this.code = code;
    this.statusCode = statusCode || DEFAULT_STATUS_BY_CODE[code] || 500;
    this.details = details;
  }
}

function throwAppError(message, code = ERROR_CODE.APPERR, statusCode, details) {
  throw new AppError(message, code, statusCode, details);
}

module.exports = {
  AppError,
  ERROR_CODE,
  throwAppError,
};
