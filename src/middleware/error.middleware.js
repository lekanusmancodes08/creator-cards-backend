const { AppError, ERROR_CODE } = require("../core/errors");

function notFoundHandler(req, res) {
  return res.status(404).json({
    status: "error",
    message: "Route not found",
  });
}

function errorHandler(error, req, res, next) {
  if (res.headersSent) {
    return next(error);
  }

  if (error instanceof SyntaxError && "body" in error) {
    return res.status(400).json({
      status: "error",
      message: "Malformed JSON body",
    });
  }

  if (error instanceof AppError) {
    if (error.code === ERROR_CODE.VALIDATIONERR && error.details) {
      return res.status(400).json(error.details);
    }

    return res.status(error.statusCode).json({
      status: "error",
      message: error.message,
      code: error.code,
    });
  }

  return res.status(500).json({
    status: "error",
    message: "Internal server error",
  });
}

module.exports = {
  notFoundHandler,
  errorHandler,
};
