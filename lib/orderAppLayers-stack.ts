import * as cdk from "aws-cdk-lib";
import { Construct } from "constructs";
import * as ssm from "aws-cdk-lib/aws-ssm";
import * as lambda from "aws-cdk-lib/aws-lambda";

export class OrdersAppLayersStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const ordersLayer = new lambda.LayerVersion(this, "OrdersLayer", {
      code: lambda.Code.fromAsset("lambda/orders/layers/ordersLayer"),
      compatibleRuntimes: [lambda.Runtime.NODEJS_14_X, lambda.Runtime.NODEJS_16_X, lambda.Runtime.NODEJS_18_X],
      layerVersionName: "OrdersLayer",
      removalPolicy: cdk.RemovalPolicy.RETAIN,
    });

    new ssm.StringParameter(this, "OrdersLayerVersionArn", {
      stringValue: ordersLayer.layerVersionArn,
    });
  }
}
