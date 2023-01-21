import { Callback, Context } from "aws-lambda";
import { ProductEvent } from "/opt/nodejs/productEventsLayer";
import { DynamoDB } from "aws-sdk";
import * as AWSXRAY from "aws-xray-sdk";

// eslint-disable-next-line @typescript-eslint/no-non-null-assertion
const eventsDynamo = process.env.EVENTS_DYNAMODB!;
const dynamobClient = new DynamoDB.DocumentClient();
// eslint-disable-next-line @typescript-eslint/no-var-requires
AWSXRAY.captureAWS(require("aws-sdk"));

function createEvent(event:ProductEvent) {
  const timestamp = Date.now();
  const ttl = ~~(timestamp / 1000) + 5 * 60;

  return dynamobClient.put({
    TableName: eventsDynamo,
    Item: {
      pk: `#product_${event.productCode}`,
      sk: `${event.eventType}#${timestamp}`,
      email: event.email,
      createdAt: timestamp,
      requestId: event.requestId,
      eventType: event.eventType,
      info: {
        productId: event.productId,
        price: event.productPrice,
      },
      ttl: ttl,
    },
  }).promise();
}

export async function handler(event: ProductEvent, context: Context, callback: Callback): Promise<void> {
  console.log(event);
  console.log(`Lambda requestId: ${context.awsRequestId}`);
  await createEvent(event);

  callback(null, JSON.stringify({
    productEventCreated: true,
    message: "OK",
  }));
}
