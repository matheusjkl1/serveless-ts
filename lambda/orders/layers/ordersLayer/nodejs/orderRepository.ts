import { DocumentClient } from "aws-sdk/clients/dynamodb";
import { randomUUID } from "crypto";

export interface OrderProduct {
  code: string,
  price: number,
}

export interface Order {
  pk: string,
  sk?: string,
  createdAt?: number,
  shipping: {
    type: "URGENT" | "ECONOMIC",
    carrier: "CORREIOS" | "FEDEX",
  }
  billing: {
    payment: "CASH" | "DEBIT_CARD" | "CREDIT_CARD",
    totalPrice: number,
  },

  products: OrderProduct[]
}

export class OrderRepository {
  private dynamoClient: DocumentClient;

  private ordersDynamoDb: string;

  constructor(dynamoClient: DocumentClient, ordersDynamoDb: string) {
    this.dynamoClient = dynamoClient;
    this.ordersDynamoDb = ordersDynamoDb;
  }

  async createOrder(order: Order): Promise<Order> {
    order.sk = randomUUID();
    order.createdAt = Date.now();
    await this.dynamoClient.put({
      TableName: this.ordersDynamoDb,
      Item: order,
    }).promise();

    return order;
  }

  async getAllOrders(): Promise<Order[]> {
    const data = await this.dynamoClient.scan({
      TableName: this.ordersDynamoDb,
    }).promise();

    return data.Items as Order[];
  }

  async getOrderByEmail(email: string): Promise<Order[]> {
    const data = await this.dynamoClient.query({
      TableName: this.ordersDynamoDb,
      KeyConditionExpression: "pk = :email",
      ExpressionAttributeValues: {
        ":email": email,
      },
    }).promise();

    return data.Items as Order[];
  }

  async getOrder(email: string, orderId: string): Promise<Order> {
    const data = await this.dynamoClient.get({
      TableName: this.ordersDynamoDb,
      Key: {
        pk: email,
        sk: orderId,
      },
    }).promise();

    if (data.Item) {
      return data.Item as Order;
    }

    throw new Error("Order not found");
  }

  async deleteOrder(email: string, orderId: string): Promise<Order> {
    const data = await this.dynamoClient.delete({
      TableName: this.ordersDynamoDb,
      Key: {
        pk: email,
        sk: orderId,
      },
      ReturnValues: "ALL_OLD",
    }).promise();

    if (data.Attributes) {
      return data.Attributes as Order;
    }

    throw new Error("Order not found");
  }
}
