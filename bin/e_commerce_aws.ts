#!/usr/bin/env node
import "source-map-support/register";
import * as cdk from "aws-cdk-lib";
import { ProductsAppStack } from "../lib/productsApp-stack";
import { ECommerceApiStack } from "../lib/ecommerceApi-stack";
import { ProductsAppLayersStack } from "../lib/productsAppLayers-stack";
import { EventsDynamoStack } from "../lib/eventsDynamoDB-stack";
import { OrdersAppLayersStack } from "../lib/ordersAppLayers-stack";
import { OrdersAppStack } from "../lib/ordersApp-stack";

const app = new cdk.App();

const env: cdk.Environment = {
  account: "218647057890",
  region: "sa-east-1",
};

const tags = {
  cost: "ECommerce",
  team: "Shen Eye Of Twilight",

};

const productsAppLayersStack = new ProductsAppLayersStack(app, "ProductsLayer", {
  tags,
  env,
});

const eventsDynamoStack = new EventsDynamoStack(app, "EventsDynamo", {
  tags,
  env,
});

const productsAppStack = new ProductsAppStack(app, "ProductsApp", {
  eventsDynamo: eventsDynamoStack.table,
  tags,
  env,
});
productsAppStack.addDependency(productsAppLayersStack);
productsAppStack.addDependency(eventsDynamoStack);

const orderAppLayersStack = new OrdersAppLayersStack(app, "OrdersAppLayers", {
  tags,
  env,
});

const orderAppStack = new OrdersAppStack(app, "OrdersApp", {
  tags,
  env,
  productsDynamo: productsAppStack.productsDynamoDb,
});

orderAppStack.addDependency(productsAppStack);
orderAppStack.addDependency(orderAppLayersStack);

const eCommerceApiStack = new ECommerceApiStack(app, "ECommerceApi", {
  productsFetchHandler: productsAppStack.productsFetchHandler,
  productsAdminHandler: productsAppStack.productsAdminHandler,
  ordersHandler: orderAppStack.ordersHandler,
  tags,
  env,
});

eCommerceApiStack.addDependency(productsAppStack);
eCommerceApiStack.addDependency(orderAppStack);
