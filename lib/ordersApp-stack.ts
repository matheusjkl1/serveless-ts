import * as cdk from "aws-cdk-lib";
import { Construct } from "constructs";
import * as sns from "aws-cdk-lib/aws-sns";
import * as ssm from "aws-cdk-lib/aws-ssm";
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as dynamodb from "aws-cdk-lib/aws-dynamodb";
import * as subs from "aws-cdk-lib/aws-sns-subscriptions";
import * as lambdaNodeJS from "aws-cdk-lib/aws-lambda-nodejs";
import * as iam from "aws-cdk-lib/aws-iam";

interface OrdersAppStackProps extends cdk.StackProps {
  productsDynamo: dynamodb.Table,
  eventsDynamo: dynamodb.Table,
}

export class OrdersAppStack extends cdk.Stack {
  readonly ordersHandler: lambdaNodeJS.NodejsFunction;

  constructor(scope:Construct, id: string, props: OrdersAppStackProps) {
    super(scope, id, props);
    const orderDynamoDb = new dynamodb.Table(this, "OrdersDynamo", {
      tableName: "orders",
      partitionKey: {
        name: "pk",
        type: dynamodb.AttributeType.STRING,
      },
      sortKey: {
        name: "sk",
        type: dynamodb.AttributeType.STRING,
      },
      billingMode: dynamodb.BillingMode.PROVISIONED,
      readCapacity: 1,
      writeCapacity: 1,
    });

    // Order Events Layer
    const orderEventsLayerArn = ssm.StringParameter.valueForStringParameter(this, "OrderEventsLayerVersionArn");
    const orderEventsLayer = lambda.LayerVersion.fromLayerVersionArn(this, "OrderEventsLayerVersionArn", orderEventsLayerArn);

    // Orders Api Layer
    const ordersLayerArn = ssm.StringParameter.valueForStringParameter(this, "OrdersLayerVersionArn");
    const ordersLayer = lambda.LayerVersion.fromLayerVersionArn(this, "OrdersLayerVersionArn", ordersLayerArn);

    // Orders Events Repository Layer
    const orderEventsRepositoryLayerArn = ssm.StringParameter.valueForStringParameter(this, "OrderEventsRepositoryLayerVersionArn");
    const orderEventsRepositoryLayer = lambda.LayerVersion.fromLayerVersionArn(this, "OrderEventsRepositoryLayerVersionArn", orderEventsRepositoryLayerArn);


    // Order Repository Layer
    const ordersApiLayerArn = ssm.StringParameter.valueForStringParameter(this, "OrdersApiLayerVersionArn");
    const ordersApiLayer = lambda.LayerVersion.fromLayerVersionArn(this, "OrdersApiLayerVersionArn", ordersApiLayerArn);

    // Products Layer
    const productsLayerArn = ssm.StringParameter.valueForStringParameter(this, "ProductsLayerVersionArn");
    const productsLayer = lambda.LayerVersion.fromLayerVersionArn(this, "ProductsLayerVersionArn", productsLayerArn);

    const ordersTopic = new sns.Topic(this, "OrderEventsTopic", {
      displayName: "Order events topic",
      topicName: "order-events",
    });

    this.ordersHandler = new lambdaNodeJS.NodejsFunction(
      this,
      "OrdersFunction",
      {
        functionName: "OrdersFunction",
        entry: "lambda/orders/ordersFunction.ts",
        handler: "handler",
        memorySize: 128,
        timeout: cdk.Duration.seconds(2),
        bundling: {
          minify: true,
          sourceMap: false,
        },
        environment: {
          PRODUCTS_DYNAMODB: props.productsDynamo.tableName,
          ORDERS_DYNAMO: orderDynamoDb.tableName,
          ORDER_EVENTS_TOPIC_ARN: ordersTopic.topicArn,
        },
        tracing: lambda.Tracing.ACTIVE,
        layers: [ordersLayer, ordersApiLayer, productsLayer, orderEventsLayer],
        insightsVersion: lambda.LambdaInsightsVersion.VERSION_1_0_119_0,
      }
    );

    orderDynamoDb.grantReadWriteData(this.ordersHandler);
    props.productsDynamo.grantReadData(this.ordersHandler);
    ordersTopic.grantPublish(this.ordersHandler);

    const orderEventsHandler = new lambdaNodeJS.NodejsFunction(
      this,
      "OrderEventsFunction",
      {
        functionName: "OrderEventsFunction",
        entry: "lambda/orders/orderEventsFunction.ts",
        handler: "handler",
        memorySize: 128,
        timeout: cdk.Duration.seconds(2),
        bundling: {
          minify: true,
          sourceMap: false,
        },
        environment: {
          EVENTS_DYNAMO: props.eventsDynamo.tableName,
        },
        tracing: lambda.Tracing.ACTIVE,
        layers: [orderEventsLayer, orderEventsRepositoryLayer],
        insightsVersion: lambda.LambdaInsightsVersion.VERSION_1_0_119_0,
      }
    );

    ordersTopic.addSubscription(new subs.LambdaSubscription(orderEventsHandler));
    const eventsDynamoPolicy = new iam.PolicyStatement({
      effect: iam.Effect.ALLOW,
      actions: ["dynamodb:PutItem"],
      resources: [props.eventsDynamo.tableArn],
      conditions: {
        ["ForAllValues:StringLike"]: {
          "dynamodb:LeadingKeys": ["#order_*"],
        },
      },
    });
    orderEventsHandler.addToRolePolicy(eventsDynamoPolicy);
  }
}
