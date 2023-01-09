import { DocumentClient } from "aws-sdk/clients/dynamodb";
import * as crypto from "crypto";

export interface Product {
  id: string,
  productName: string;
  code: string;
  price: number;
  model: string;
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

  async getProductById(prdocutId: string): Promise<Product> {
    const data = await this.dynamoClient.get({
      TableName: this.productsDynamo,
      Key: {
        id: prdocutId,
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
    const secret = "abcdefg";
    const hash = crypto.createHmac("sha256", secret)
      .update("I love cupcakes")
      .digest("hex");
    product.id = hash;

    this.dynamoClient.put({
      TableName: this.productsDynamo,
      Item: product,
    }).promise();

    return product;
  }
}
