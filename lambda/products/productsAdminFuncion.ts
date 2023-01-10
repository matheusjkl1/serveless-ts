/* eslint-disable @typescript-eslint/no-non-null-assertion */
import { APIGatewayProxyEvent, APIGatewayProxyResult, Context } from "aws-lambda";
import { Product, ProductRepository } from "/opt/nodejs/productsLayer";
import { DynamoDB } from "aws-sdk";

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
    const product = JSON.parse(event.body!) as Product;
    const createdProduct = await productRepository.create(product);
    return {
      statusCode: 201,
      body: JSON.stringify(createdProduct),
    };
  }
  else if (event.resource === "/products/{id}") {
    const id = event.pathParameters?.id as string;
    if (method === "PUT") {
      try {
        const product = JSON.parse(event.body!) as Product;
        const updatedProduct = await productRepository.updateProduct(id, product);
        return {
          statusCode: 200,
          body: JSON.stringify(updatedProduct),
        };
      }
      catch (ConditionalCheckFailedException) {
        return {
          statusCode: 404,
          body: "Product not found",
        };
      }
    }
    if (method === "DELETE") {
      const product = await productRepository.deleteProduct(id);
      try {
        return {
          statusCode: 204,
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
  }

  return {
    statusCode: 400,
    body: JSON.stringify({ message: "Bad Request" }),
  };
}

