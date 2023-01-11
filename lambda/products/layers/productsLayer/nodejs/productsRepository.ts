import { DocumentClient } from "aws-sdk/clients/dynamodb";
import { randomUUID } from "crypto";

export interface Product {
  id: string,
  productName: string;
  code: string;
  price: number;
  model: string;
  productUrl: string;
}

export class ProductRepository {
  private dynamoClient : DocumentClient;

  private productsDynamo: string;

  constructor(dynamoClient: DocumentClient, productsDynamo: string) {
    this.dynamoClient = dynamoClient;
    this.productsDynamo = productsDynamo;
  }

  async getAllProducts(): Promise<Product[]> {

    const data = await this.dynamoClient.scan({
      TableName: this.productsDynamo,
    }).promise();

    return data.Items as Product [];
  }

  async getProductById(productId: string): Promise<Product> {
    const data = await this.dynamoClient.get({
      TableName: this.productsDynamo,
      Key: {
        id: productId,
      },
    }).promise();

    if (data.Item) {
      return data.Item as Product;
    }
    else {
      throw new Error("Product not found");
    }
  }

  async create(product: Product): Promise<Product> {
    product.id = randomUUID();

    await this.dynamoClient.put({
      TableName: this.productsDynamo,
      Item: product,
    }).promise();

    return product;
  }

  async deleteProduct(productId: string): Promise<Product> {
    const data = await this.dynamoClient.delete({
      TableName: this.productsDynamo,
      Key: {
        id: productId,
      },
      ReturnValues: "ALL_OLD",
    }).promise();

    if (data.Attributes) {
      return data.Attributes as Product;
    }
    else {
      throw new Error("Product not found");
    }
  }

  async updateProduct(productId: string, product: Product) {
    const data = await this.dynamoClient.update({
      TableName: this.productsDynamo,
      Key: {
        id: productId,
      },
      ConditionExpression: "attribute_exists(id)",
      ReturnValues: "UPDATED_NEW",
      UpdateExpression: "set productName = :n, code = :c, price = :p, model= :m, productUrl = :u",
      ExpressionAttributeValues: {
        ":n": product.productName,
        ":c": product.code,
        ":p": product.price,
        ":m": product.model,
        ":u": product.productUrl,
      },
    }).promise();

    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    data.Attributes!.id = productId;

    return data.Attributes as Product;

  }
}
