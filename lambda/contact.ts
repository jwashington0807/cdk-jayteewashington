import { Handler } from "aws-cdk-lib/aws-lambda"

export const handler: Handler = async () => {
  return new Promise<string>(async (resolve, reject) => {
    try {
      return resolve("This is a function");
    }
    catch(error) {
      reject();
    }
  });
};