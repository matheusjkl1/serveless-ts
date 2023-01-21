import * as cdk from "aws-cdk-lib";
import { Construct } from "constructs";
import * as ssm from "aws-cdk-lib/aws-ssm";
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as dynamodb from "aws-cdk-lib/aws-dynamodb";
import * as lambdaNodeJS from "aws-cdk-lib/aws-lambda-nodejs";

interface OrdersAppStackProps extends cdk.StackProps {
  productsDynamo: dynamodb.Table
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

    const ordersLayersArn = ssm.StringParameter.valueForStringParameter(this, "OrdersLayerVersionArn");
    const ordersLayers = lambda.LayerVersion.fromLayerVersionArn(this, "OrdersLayerVersionArn", ordersLayersArn);

    const productsLayersArn = ssm.StringParameter.valueForStringParameter(this, "ProductsLayerVersionArn");
    const productsLayers = lambda.LayerVersion.fromLayerVersionArn(this, "ProductsLayerVersionArn", productsLayersArn);

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
        },
        tracing: lambda.Tracing.ACTIVE,
        layers: [ordersLayers, productsLayers],
        insightsVersion: lambda.LambdaInsightsVersion.VERSION_1_0_119_0,
      }
    );

    orderDynamoDb.grantReadWriteData(this.ordersHandler);
    props.productsDynamo.grantReadData(this.ordersHandler);
  }
}
