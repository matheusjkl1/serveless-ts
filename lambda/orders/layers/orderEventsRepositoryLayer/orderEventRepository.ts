import { DocumentClient } from "aws-sdk/clients/dynamodb";

export interface OrderEventDynamo {
  pk: string;
  sk: string;
  ttl: number;
  email: string;
  createdAt: number;
  eventType: string;
  info: {
    orderId: string;
    productCodes: string[];
    messageId: string;
  };
  requestId: string;
}

export class OrderEventRepository {
  private dynamoClient: DocumentClient;

  private eventsDynamo: string;

  constructor(dynamoClient: DocumentClient, eventsDynamo: string) {
    this.dynamoClient = dynamoClient;
    this.eventsDynamo = eventsDynamo;
  }

  createOrderEvent(orderEvent: OrderEventDynamo) {
    return this.dynamoClient.put({
      TableName: this.eventsDynamo,
      Item: orderEvent,
    }).promise();
  }
}
