import * as lambdaNodeJS from "aws-cdk-lib/aws-lambda-nodejs";
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as cdk from "aws-cdk-lib";
import * as dynamodb from "aws-cdk-lib/aws-dynamodb";
import * as ssm from "aws-cdk-lib/aws-ssm";
import { Construct } from "constructs";

export class ProductsAppStack extends cdk.Stack {
  readonly productsDynamoDb: dynamodb.Table;

  readonly productsFetchHandler: lambdaNodeJS.NodejsFunction;

  readonly productsAdminHandler: lambdaNodeJS.NodejsFunction;

  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    this.productsDynamoDb = new dynamodb.Table(this, "ProductsDynamoDb", {
      tableName: "products",
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      partitionKey: {
        name: "id",
        type: dynamodb.AttributeType.STRING,
      },
      billingMode: dynamodb.BillingMode.PROVISIONED,
      readCapacity: 1,
      writeCapacity: 1,
    });

    const productsLayersArn = ssm.StringParameter.valueForStringParameter(this, "ProductsLayerVersionArn");
    const productsLayers = lambda.LayerVersion.fromLayerVersionArn(this, "ProductsLayerVersionArn", productsLayersArn);

    this.productsFetchHandler = new lambdaNodeJS.NodejsFunction(
      this,
      "ProductsFetchFunction",

      {
        functionName: "ProductsFetchFunction",
        entry: "lambda/products/productsFetchFuncion.ts",
        handler: "handler",
        memorySize: 128,
        timeout: cdk.Duration.seconds(5),
        bundling: {
          minify: true,
          sourceMap: false,
        },
        environment: {
          PRODUCTS_DYNAMODB: this.productsDynamoDb.tableName,
        },
        layers: [productsLayers],
      }
    );
    this.productsDynamoDb.grantReadData(this.productsFetchHandler);

    this.productsAdminHandler = new lambdaNodeJS.NodejsFunction(
      this,
      "ProductsAdminFunction",
      {
        functionName: "ProductsAdminFunction",
        entry: "lambda/products/productsAdminFuncion.ts",
        handler: "handler",
        memorySize: 128,
        timeout: cdk.Duration.seconds(5),
        bundling: {
          minify: true,
          sourceMap: false,
        },
        environment: {
          PRODUCTS_DYNAMODB: this.productsDynamoDb.tableName,
        },
        layers: [productsLayers],
      }
    );
    this.productsDynamoDb.grantWriteData(this.productsAdminHandler);
  }
}
