import { S3 } from "aws-sdk";
import { ClientConfiguration } from "aws-sdk/clients/acm";
import { PutObjectRequest, GetObjectAclRequest } from "aws-sdk/clients/s3";
import fs from "fs";
import { v4 as uuidv4 } from "uuid";

class S3Service {
  private connection: S3;
  constructor() {
    const s3Configs: ClientConfiguration = {
      region: process.env.AWS_DEFAULT_REGION,
      credentials: {
        accessKeyId: process?.env?.AWS_ACCESS_KEY_ID || "",
        secretAccessKey: process?.env?.AWS_ACCESS_KEY_SECRET || "",
      },
    };

    this.connection = new S3(s3Configs);
  }

  public getConnection() {
    return this.connection;
  }

  public async uploadObjects(
    file: Buffer,
    filename: string,
    extraName: string = uuidv4()
  ): Promise<{ local: string; archiveKey: string } | undefined> {
    return new Promise(async (resolve, reject) => {
      const object = await this.getObject(filename);
      const params: PutObjectRequest = {
        Bucket: process.env.AWS_BUCKET_NAME || "",
        Key: !object ? filename : `${extraName + "_document_" + filename}`,
        Body: file,
      };

      this.connection.upload(params, (err, data) => {
        if (err) {
          reject(err);
          fs.rm(`./${filename}`, () => {});
        }

        resolve({ local: data.Location, archiveKey: data.Key });
        fs.rm(`./${filename}`, () => {});
      });
    });
  }

  public getObject(filename: string): Promise<unknown> {
    const params: GetObjectAclRequest = {
      Bucket: process.env.AWS_BUCKET_NAME || "",
      Key: filename,
    };

    return new Promise((resolve, reject) => {
      this.connection.getObject(params, (err, data) => {
        if (err) {
          resolve(undefined);
        }
        resolve(data?.Body);
      });
    });
  }
}

export default S3Service;
