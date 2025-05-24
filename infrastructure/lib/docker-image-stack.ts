import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { Architecture, DockerImageCode, DockerImageFunction } from 'aws-cdk-lib/aws-lambda';

export class CdkDeployLambdaDockerStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: cdk.StackProps) {
    super(scope, id, props);

    //#region Parameters

    //#endregion

    //#region Lambdas

    // Define Lambda Functions
    const lambdafunction = new DockerImageFunction(this, `docker-email-lambda`, {
      code: DockerImageCode.fromImageAsset('lib/docker'),
      architecture: Architecture.ARM_64
    });

    //#endregion
  }
}
