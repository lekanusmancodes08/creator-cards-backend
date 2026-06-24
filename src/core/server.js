function createHandler(config) {
  return {
    path: config.path,
    method: config.method.toLowerCase(),
    middlewares: config.middlewares || [],
    props: config.props || {},
    handler: config.handler,
  };
}

module.exports = {
  createHandler,
};
