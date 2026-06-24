const { createHandler } = require("../../core/server");
const deleteCreatorCard = require("../../services/creator-cards/delete-creator-card");
const { serializeCard } = require("../../utils/serializer");
const Messages = require("../../messages/creator-cards");

module.exports = createHandler({
  path: "/creator-cards/:slug",
  method: "delete",
  middlewares: [],
  async handler(rc, helpers) {
    const payload = {
      slug: rc.params.slug,
      ...rc.body,
    };

    const response = await deleteCreatorCard(payload);

    return {
      status: helpers.http_statuses.HTTP_200_OK,
      message: Messages.DELETE_SUCCESS,
      data: serializeCard(response, { includeAccessCode: true }),
    };
  },
});
