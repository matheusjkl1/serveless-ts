import { AWSError, DynamoDB } from "aws-sdk";
import * as AWSXRay from "aws-xray-sdk";
import { OrderEventRepository } from "./layers/orderEventsRepositoryLayer/orderEventRepository";
import { Context, SNSEvent, SNSMessage } from "aws-lambda";
import { Envelope, OrderEvent } from "/opt/nodejs/orderEventsLayer";
import { OrderEventDynamo } from "./layers/orderEventsRepositoryLayer/orderEventRepository";
import { PromiseResult } from "aws-sdk/lib/request";
AWSXRay.captureAWS(require("aws-sdk"));

// eslint-disable-next-line @typescript-eslint/no-non-null-assertion
const eventsDynamo = process.env.EVENTS_DYNAMO!;

const dynamoClient = new DynamoDB.DocumentClient();
const orderEventsRepository = new OrderEventRepository(dynamoClient, eventsDynamo);

export async function hendler(event: SNSEvent, context: Context): Promise<void> {

  const promises: Promise<PromiseResult<DynamoDB.DocumentClient.PutItemOutput, AWSError>> [] = [];
  event.Records.forEach((record) => {
    promises.push(createEvent(record.Sns));
  });

  await Promise.all(promises);

  return;
}

function createEvent(body: SNSMessage) {
  const envelope = JSON.parse(body.Message) as Envelope;
  const event = JSON.parse(envelope.data) as OrderEvent;
  console.log(
    `Order event - MessageId: ${body.MessageId}`
  );

  const timestamp = Date.now();
  const ttl = ~~(timestamp / 1000 + 5 * 60);

  const orderEventDynamo: OrderEventDynamo = {
    pk: `#order_${event.orderId}`,
    sk: `${envelope.eventType}#${timestamp}`,
    ttl: ttl,
    email: event.email,
    createdAt: timestamp,
    requestId: event.requestId,
    eventType: envelope.eventType,
    info: {
      orderId: event.orderId,
      productCodes: event.productCodes,
      messageId: body.MessageId,
    },
  };

  return orderEventsRepository.createOrderEvent(orderEventDynamo);
}
