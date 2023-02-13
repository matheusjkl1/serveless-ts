/* eslint-disable @typescript-eslint/no-non-null-assertion */

import * as AWSXRay from "aws-xray-sdk";
import { DynamoDB } from "aws-sdk";
import { APIGatewayProxyEvent, APIGatewayProxyResult, Context } from "aws-lambda";
import { Order, OrderRepository } from "/opt/nodejs/ordersLayer";
import { Product, ProductRepository } from "/opt/nodejs/productsLayer";
import { CarrierType, OrderProductResponse, OrderRequest, OrderResponse, PaymentType, ShippingType } from "/opt/nodejs/ordersApiLayer";

// eslint-disable-next-line @typescript-eslint/no-var-requires
AWSXRay.captureAWS(require("aws-sdk"));

const ordersDynamoDb = process.env.ORDERS_DYNAMO!;
const productDynamoDb = process.env.PRODUCTS_DYNAMODB!;

const dynamoClient = new DynamoDB.DocumentClient();

const orderRepository = new OrderRepository(dynamoClient, ordersDynamoDb);
const productRepository = new ProductRepository(dynamoClient, productDynamoDb);

function convertToOrderResponse(order: Order): OrderResponse {
  const orderProducts: OrderProductResponse[] = [];
  order.products.forEach((product) => {
    orderProducts.push({
      code: product.code,
      price: product.price,
    });
  });

  const orderResponse: OrderResponse = {
    email: order.pk,
    id: order.sk!,
    createdAt: order.createdAt!,
    products: orderProducts,
    billing: {
      payment: order.billing.payment as PaymentType,
      totalPrice: order.billing.totalPrice,
    },
    shipping: {
      type: order.shipping.type as ShippingType,
      carrier: order.shipping.carrier as CarrierType,
    },
  };

  return orderResponse;
}

function buildOrder(orderRequest: OrderRequest, products: Product[]): Order {
  const orderProducts: OrderProductResponse[] = [];
  let totalPrice = 0;
  products.forEach((product) => {
    totalPrice += product.price;
    orderProducts.push({
      code: product.code,
      price: product.price,
    });
  });

  const order: Order = {
    pk: orderRequest.email,
    billing: {
      payment: orderRequest.payment,
      totalPrice: totalPrice,
    },
    shipping: {
      type: orderRequest.shipping.type,
      carrier: orderRequest.shipping.carrier,
    },
    products: orderProducts,
  };

  return order;
}

export async function handler(event: APIGatewayProxyEvent, context: Context): Promise<APIGatewayProxyResult> {

  const method = event.httpMethod;
  const apiRequestId = event.requestContext.requestId;
  const lambdaRequestId = context.awsRequestId;

  console.log({ apiRequestId, lambdaRequestId });

  if (method === "GET") {
    if (event.queryStringParameters) {
      const email = event.queryStringParameters!.email;
      const orderId = event.queryStringParameters!.orderId;
      if (email) {
        if (orderId) {
          try {
            const order = await orderRepository.getOrder(email, orderId);
            return {
              statusCode: 200,
              body: JSON.stringify(convertToOrderResponse(order)),
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
        const orders = await orderRepository.getOrderByEmail(email);
        return {
          statusCode: 200,
          body: JSON.stringify(orders.map(convertToOrderResponse)),
        };
      }
    }

    const orders = await orderRepository.getAllOrders();

    return {
      statusCode: 200,
      body: JSON.stringify(orders.map(convertToOrderResponse)),
    };
  }
  else if (method === "POST") {
    const orderRequest = JSON.parse(event.body!) as OrderRequest;
    const products = await productRepository.getProductsByIds(orderRequest.productIds);
    if (products.length === orderRequest.productIds.length) {
      const order = buildOrder(orderRequest, products);
      const orderCreated = await orderRepository.createOrder(order);

      return {
        statusCode: 201,
        body: JSON.stringify(convertToOrderResponse(orderCreated)),
      };
    }
    else {
      return {
        statusCode: 404,
        body: "Some product was not found",
      };
    }
  }
  else if (method === "DELETE") {
    const email = event.queryStringParameters!.email!;
    const orderId = event.queryStringParameters!.orderId!;


    try {
      const orderDeleted = await orderRepository.deleteOrder(email, orderId);

      return {
        statusCode: 204,
        body: JSON.stringify(convertToOrderResponse(orderDeleted)),
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
    statusCode: 400,
    body: "Bad Request",
  };
}
