const { createHandler } = require("../../core/server");
const createCreatorCard = require("../../services/creator-cards/create-creator-card");
const { serializeCard } = require("../../utils/serializer");
const Messages = require("../../messages/creator-cards");

module.exports = createHandler({
  path: "/creator-cards",
  method: "post",
  middlewares: [],
  async handler(rc, helpers) {
    const response = await createCreatorCard(rc.body);

    return {
      status: helpers.http_statuses.HTTP_200_OK,
      message: Messages.CREATE_SUCCESS,
      data: serializeCard(response, { includeAccessCode: true }),
    };
  },
});
