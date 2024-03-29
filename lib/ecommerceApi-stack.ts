import * as cdk from "aws-cdk-lib";
import * as apigateway from "aws-cdk-lib/aws-apigateway";
import * as lambdaNodeJS from "aws-cdk-lib/aws-lambda-nodejs";
import * as cwlogs from "aws-cdk-lib/aws-logs";
import { Construct } from "constructs";

interface ECommerceApiStackProps extends cdk.StackProps {
  productsFetchHandler: lambdaNodeJS.NodejsFunction
  productsAdminHandler: lambdaNodeJS.NodejsFunction
  ordersHandler: lambdaNodeJS.NodejsFunction
}

export class ECommerceApiStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: ECommerceApiStackProps) {
    super(scope, id, props);
    const logGroup = new cwlogs.LogGroup(this, "ECommerceApiLogs");
    const api = new apigateway.RestApi(this, "ECommerceApi", {
      restApiName: "ECommerceApi",
      cloudWatchRole: true,
      deployOptions: {
        accessLogDestination: new apigateway.LogGroupLogDestination(logGroup),
        accessLogFormat: apigateway.AccessLogFormat.jsonWithStandardFields({
          httpMethod: true,
          ip: false,
          protocol: true,
          requestTime: true,
          resourcePath: true,
          responseLength: true,
          status: true,
          caller: true,
          user: true,
        }),
      },
    });

    this.createProductsService(props, api);
    this.createOrdersService(props, api);
  }

  private createOrdersService(props: ECommerceApiStackProps, api: apigateway.RestApi) {
    const ordersIntegration = new apigateway.LambdaIntegration(props.ordersHandler);

    const ordersResource = api.root.addResource("orders");

    ordersResource.addMethod("GET", ordersIntegration);

    const orderDeletionValidator = new apigateway.RequestValidator(this, "OrderDeletionValidator", {
      restApi: api,
      requestValidatorName: "OrderDeletionValidator",
      validateRequestParameters: true,
    });

    ordersResource.addMethod("DELETE", ordersIntegration, {
      requestParameters: {
        "method.request.querystring.email": true,
        "method.request.querystring.orderId": true,
      },

      requestValidator: orderDeletionValidator,
    });

    const orderRequestValidator = new apigateway.RequestValidator(this, "OrderRequestValidator", {
      restApi: api,
      requestValidatorName: "Order request validator",
      validateRequestBody: true,
    });
    const orderModel = new apigateway.Model(this, "OrderModel", {
      restApi: api,
      schema: {
        type: apigateway.JsonSchemaType.OBJECT,
        properties: {
          email: {
            type: apigateway.JsonSchemaType.STRING,
          },
          productIds: {
            type: apigateway.JsonSchemaType.ARRAY,
            minItems: 1,
            items: {
              type: apigateway.JsonSchemaType.STRING,
            },
          },
          payment: {
            type: apigateway.JsonSchemaType.STRING,
            enum: ["CASH", "DEBIT_CARD", "CREDIT_CARD"],
          },
        },
        required: [
          "email",
          "productIds",
          "payment",
        ],
      },
    });
    ordersResource.addMethod("POST", ordersIntegration, {
      requestValidator: orderRequestValidator,
      requestModels: {
        "application/json": orderModel,
      },
    });
  }

  private createProductsService(props: ECommerceApiStackProps, api: apigateway.RestApi) {
    const productsFetchIntegration = new apigateway.LambdaIntegration(props.productsFetchHandler);

    const productsResource = api.root.addResource("products");
    productsResource.addMethod("GET", productsFetchIntegration);

    const productIdResource = productsResource.addResource("{id}");
    productIdResource.addMethod("GET", productsFetchIntegration);

    const productsAdminIntegration = new apigateway.LambdaIntegration(props.productsAdminHandler);

    const productRequestValidator = new apigateway.RequestValidator(this, "ProductRequestValidator", {
      restApi: api,
      requestValidatorName: "Product request validator",
      validateRequestBody: true,
    });

    const productModel = new apigateway.Model(this, "ProductModel", {
      restApi: api,
      contentType: "application/json",
      schema: {
        type: apigateway.JsonSchemaType.OBJECT,
        properties: {
          productName: {
            type: apigateway.JsonSchemaType.STRING,
          },
          code: {
            type: apigateway.JsonSchemaType.STRING,
          },
          price: {
            type: apigateway.JsonSchemaType.NUMBER,
          },
          model: {
            type: apigateway.JsonSchemaType.STRING,
          },
          productUrl: {
            type: apigateway.JsonSchemaType.STRING,
          },
        },
        required: [
          "productName",
          "code",
        ],
      },
    });

    productsResource.addMethod("POST", productsAdminIntegration, {
      requestValidator: productRequestValidator,
      requestModels: {
        "application/json": productModel,
      },
    });

    productIdResource.addMethod("PUT", productsAdminIntegration, {
      requestValidator: productRequestValidator,
      requestModels: {
        "application/json": productModel,
      },
    });

    productIdResource.addMethod("DELETE", productsAdminIntegration);
  }
}
