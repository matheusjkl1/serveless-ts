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
    return {
      body: JSON.stringify({ message: "POST!" }),
      statusCode: 201,
    };
  }
  else if (event.resource === "/products/{id}") {
    const id = event.pathParameters?.id as string;
    console.log(`PUT /products/${id}`);
    if (method === "PUT") {
      return {
        body: JSON.stringify({ message: "PUT!" }),
        statusCode: 200,
      };
    }
    if (method === "DELETE") {
      console.log(`DELETE /products/${id}`);
      return {
        body: JSON.stringify({ message: "DELETE!" }),
        statusCode: 204,
      };
    }
  }

  return {
    body: JSON.stringify({ message: "Bad Request" }),
    statusCode: 400,
  };
}

