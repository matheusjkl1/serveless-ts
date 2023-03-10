import { APIGatewayProxyEvent, APIGatewayProxyResult, Context } from "aws-lambda";
import { ProductRepository } from "/opt/nodejs/productsLayer";
import { DynamoDB } from "aws-sdk";
import * as AWSXRay from "aws-xray-sdk";

// eslint-disable-next-line @typescript-eslint/no-var-requires
AWSXRay.captureAWS(require("aws-sdk"));

// eslint-disable-next-line @typescript-eslint/no-non-null-assertion
const productsDynamodb = process.env.PRODUCTS_DYNAMODB!;
const dynamoClient = new DynamoDB.DocumentClient();

const productRepository = new ProductRepository(dynamoClient, productsDynamodb);

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

      const products = await productRepository.getAllProducts();

      return {
        statusCode: 200,
        body: JSON.stringify(products),
      };
    }
  }
  else if (event.resource === "/products/{id}") {
    const id = event.pathParameters?.id as string;
    try {
      const product = await productRepository.getProductById(id);

      return {
        statusCode: 200,
        body: JSON.stringify(product),
      };
    }
    catch (error) {
      console.error((<Error>error).message);
      return {
        statusCode: 404,
        body: (<Error>error).message,
      };
    }
  }

  return {
    body: JSON.stringify({ message: "Bad Request" }),
    statusCode: 400,
  };
}
