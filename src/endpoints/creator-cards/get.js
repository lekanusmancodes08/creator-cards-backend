const { createHandler } = require("../../core/server");
const getCreatorCard = require("../../services/creator-cards/get-creator-card");
const { serializeCard } = require("../../utils/serializer");
const Messages = require("../../messages/creator-cards");

module.exports = createHandler({
  path: "/creator-cards/:slug",
  method: "get",
  middlewares: [],
  async handler(rc, helpers) {
    const payload = {
      slug: rc.params.slug,
      access_code: rc.query.access_code,
    };

    const response = await getCreatorCard(payload);

    return {
      status: helpers.http_statuses.HTTP_200_OK,
      message: Messages.RETRIEVE_SUCCESS,
      data: serializeCard(response, { includeAccessCode: false }),
    };
  },
});
