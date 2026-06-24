const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");
const { errorHandler, notFoundHandler } = require("./middleware/error.middleware");
const createCreatorCardEndpoint = require("./endpoints/creator-cards/create");
const getCreatorCardEndpoint = require("./endpoints/creator-cards/get");
const deleteCreatorCardEndpoint = require("./endpoints/creator-cards/delete");

const app = express();

const http_statuses = {
  HTTP_200_OK: 200,
  HTTP_400_BAD_REQUEST: 400,
  HTTP_403_FORBIDDEN: 403,
  HTTP_404_NOT_FOUND: 404,
  HTTP_500_INTERNAL_SERVER_ERROR: 500,
};

const endpointConfigs = [
  createCreatorCardEndpoint,
  getCreatorCardEndpoint,
  deleteCreatorCardEndpoint,
];

app.use(helmet());
app.use(cors());
app.use(morgan("dev"));
app.use(express.json());

for (const endpoint of endpointConfigs) {
  app[endpoint.method](endpoint.path, ...endpoint.middlewares, async (req, res, next) => {
    try {
      const result = await endpoint.handler(
        {
          body: req.body,
          params: req.params,
          query: req.query,
          headers: req.headers,
          method: req.method,
          path: req.path,
          props: endpoint.props,
          meta: {},
        },
        {
          http_statuses,
        }
      );

      return res.status(result.status || 200).json({
        status: "success",
        message: result.message,
        data: result.data,
      });
    } catch (error) {
      return next(error);
    }
  });
}

app.use(notFoundHandler);
app.use(errorHandler);

module.exports = {
  app,
};
