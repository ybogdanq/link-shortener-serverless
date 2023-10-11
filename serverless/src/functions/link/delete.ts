import { DynamoDB } from "aws-sdk";

import ApiError from "../../exceptions/apiError";
import { Link } from "../../types/Link";
import { errorResponse } from "../../utils/responses/errorResponse";
import { successResponse } from "../../utils/responses/successResponse";

export const handler = async (event) => {
  try {
    const { principalId: userId } = event.requestContext?.authorizer;
    console.log("Delete link auth User ==> ", userId);
    const dynamodb = new DynamoDB.DocumentClient();
    const { id } = event.pathParameters;

    if (!id) {
      throw ApiError.BadRequest("Bad id provided");
    }

    const linkQueryRes = await dynamodb
      .query({
        TableName: "LinkTable",
        IndexName: "UserIdIndex",
        KeyConditionExpression: "userId = :userId",
        FilterExpression: "id = :id",
        ExpressionAttributeValues: {
          ":userId": userId,
          ":id": id,
        },
      })
      .promise();

    if (!linkQueryRes.Items || linkQueryRes.Items.length === 0) {
      throw ApiError.BadRequest("Bad link id provided");
    }
    const linkData = linkQueryRes.Items[0] as Link;

    const deleted = await dynamodb
      .delete({
        TableName: "LinkTable",
        Key: {
          id: linkData.id,
        },
        ReturnValues: "ALL_OLD",
      })
      .promise();


    return successResponse({
      statusCode: 200,
      body: deleted.Attributes,
    });
  } catch (error) {
    return errorResponse({
      statusCode: error?.status || 500,
      body: error.message || "Unhandled error",
    });
  }
};
