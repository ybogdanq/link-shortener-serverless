import { DynamoDB } from "aws-sdk";
import ApiError from "../../exceptions/apiError";
import { Link } from "../../types/Link";

export const handler = async (event) => {
  try {
    const dynamodb = new DynamoDB.DocumentClient();
    const { id } = event.pathParameters;

    if (!id) {
      throw ApiError.BadRequest("Bad id provided");
    }

    const linkQueryRes = await dynamodb
      .get({
        TableName: "LinkTable",
        Key: { id },
      })
      .promise();

    if (!linkQueryRes.Item) {
      throw ApiError.BadRequest("Bad link id provided");
    }

    const linkData = linkQueryRes.Item as Link;
    const currentTimestamp = Math.floor(Date.now() / 1000);

    if (!linkData.active || linkData.expiredAt < currentTimestamp) {
      throw ApiError.BadRequest("Link is not active anymore");
    }

    const deactivateCondition =
      linkData.type === "SINGLE" || linkData.expiredAt < currentTimestamp;
    let conditionalParams;

    if (deactivateCondition) {
      conditionalParams = {
        UpdateExpression: "set active = :newActive",
        ExpressionAttributeValues: { ":newActive": false },
      };
    } else {
      conditionalParams = {
        UpdateExpression: "set visits = :incrementedVisits",
        ExpressionAttributeValues: {
          ":incrementedVisits": linkData.visits + 1,
        },
      };
    }
    await dynamodb
      .update({
        TableName: "LinkTable",
        Key: {
          id: linkData.id,
        },
        ...conditionalParams,
        ReturnValues: "ALL_NEW",
      })
      .promise();

    const httpRegex = /^(http|https):\/\//;
    return {
      statusCode: 302,
      headers: {
        "Access-Control-Allow-Origin": process.env.CLIENT_URL || "*",
        "Access-Control-Allow-Headers": "*",
        "Access-Control-Allow-Credentials": true,
        "Content-Type": "application/json",
        Location: httpRegex.test(linkData.redirectLink)
          ? linkData.redirectLink
          : "http://" + linkData.redirectLink,
      },
      body: JSON.stringify({ message: "Redirecting to a new URL" }),
    };
  } catch (error) {
    return {
      statusCode: error?.status || 500,
      body: error.message || "Unhandled error",
    };
  }
};
