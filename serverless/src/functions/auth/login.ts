import { DynamoDB } from "aws-sdk";
import { LoginCustomerDto } from "../../dtos/LoginCustomer";
import { compareSync } from "bcryptjs";
import { IUser } from "../../types/User";
import { serializeUserInfoAndJWT } from "../../services/token";
import { successResponse } from "../../utils/responses/successResponse";
import { errorResponse } from "../../utils/responses/errorResponse";

export const handler = async (event) => {
  try {
    const body = JSON.parse(event.body);
    const dynamodb = new DynamoDB.DocumentClient();
    const { email, password } = LoginCustomerDto(body);

    const userRes = await dynamodb
      .query({
        TableName: "CustomerTable",
        IndexName: "EmailIndex",
        KeyConditionExpression: "email = :email",
        ExpressionAttributeValues: {
          ":email": email,
        },
      })
      .promise();

    const user = userRes.Items ? (userRes.Items[0] as IUser) : null;

    if (!user) {
      throw new Error("User or password is incorrect, please try again");
    }

    const passwordsEqual = compareSync(password, user.password);
    if (!passwordsEqual)
      throw new Error("User or password is incorrect, please try again");

    const userDataAndJWT = await serializeUserInfoAndJWT(user);

    // Create a cookie string
    const cookieName = "refreshToken";
    const cookieValue = userDataAndJWT.refreshToken;
    const maxAge = 30 * 24 * 60 * 60;
    const cookieFinal = `${cookieName}=${cookieValue}; HttpOnly; Max-Age=${maxAge};`;

    return successResponse({
      statusCode: 200,
      headers: {
        "Set-Cookie": cookieFinal,
      },
      body: {
        ...userDataAndJWT,
      },
    });
  } catch (error) {
    return errorResponse({
      statusCode: error?.status || 500,
      body: error.message || "Unhandled error",
    });
  }
};