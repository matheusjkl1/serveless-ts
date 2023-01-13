/* eslint-disable @typescript-eslint/no-non-null-assertion */
import { APIGatewayProxyEvent, APIGatewayProxyResult, Context } from "aws-lambda";
import { Product, ProductRepository } from "/opt/nodejs/productsLayer";
import { DynamoDB, Lambda } from "aws-sdk";
import * as AWSXRay from "aws-xray-sdk";
import { ProductEvent, ProductEventType } from "/opt/nodejs/productEventsLayer";

// eslint-disable-next-line @typescript-eslint/no-var-requires
AWSXRay.captureAWS(require("aws-sdk"));

const productsDynamodb = process.env.PRODUCTS_DYNAMODB!;
const dynamoClient = new DynamoDB.DocumentClient();

const productEventFunctionName = process.env.PRODUCTS_EVENTS_FUNCTION_NAME!;
const lambdaClient = new Lambda();

const productRepository = new ProductRepository(dynamoClient, productsDynamodb);

async function sendProductEvent(product: Product, eventType: ProductEventType, email: string, lambdaRequestId: string) {
  const event: ProductEvent = {
    email: email,
    eventType: eventType,
    productCode: product.code,
    productId: product.id,
    productPrice: product.price,
    requestId: lambdaRequestId,
  };

  lambdaClient.invoke({
    FunctionName: productEventFunctionName,
    Payload: JSON.stringify(event),
    InvocationType: "RequestResponse",
  });
}

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

    const response = await sendProductEvent(createdProduct, ProductEventType.CREATED, "testeCre@email.com", lambdaRequestId);
    console.log(response);

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

        const response = await sendProductEvent(updatedProduct, ProductEventType.UPDATED, "testeUp@email.com", lambdaRequestId);
        console.log(response);

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
      try {
        const product = await productRepository.deleteProduct(id);

        const response = await sendProductEvent(product, ProductEventType.DELETED, "testeDel@email.com", lambdaRequestId);
        console.log(response);

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

