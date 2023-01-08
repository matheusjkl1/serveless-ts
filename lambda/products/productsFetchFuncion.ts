import { APIGatewayProxyEvent, APIGatewayProxyResult, Context } from "aws-lambda";

export async function handler(
  event: APIGatewayProxyEvent,
  context: Context
): Promise<APIGatewayProxyResult> {

  const lambdaRequestId = context.awsRequestId;
  const apiRequestId = event.requestContext.requestId;

  console.log({ lambdaRequestId, apiRequestId });

  const method = event.httpMethod;
  if (event.resource === "/products") {
    if (method === "GET") {
      return {
        body: JSON.stringify({ message: "Top!" }),
        statusCode: 200,
      };
    }
  }
  else if (event.resource === "/products/{id}") {
    const id = event.pathParameters?.id as string;
    console.log(`GET /products/${id}`);

    return {
      statusCode: 200,
      body: JSON.stringify({ message: `GET /products/${id}` }),
    };
  }

  return {
    body: JSON.stringify({ message: "Bad Request" }),
    statusCode: 400,
  };
}
