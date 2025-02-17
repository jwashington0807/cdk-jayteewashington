import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { InfrastructureStackProps } from '../models/infrastructure';
import { Bucket } from 'aws-cdk-lib/aws-s3';
import { RemovalPolicy } from 'aws-cdk-lib';

export class InfrastructureStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: InfrastructureStackProps) {
    super(scope, id, props);

    const { DEPLOY_ENVIRONMENT } = props;

    console.log(`${DEPLOY_ENVIRONMENT} environment detected. Deploying S3 Bucket`);

    const infrastructureBucket = new Bucket(
      this,
      'InfrastructureBucket', 
      {
        bucketName: `jayteewashington-${DEPLOY_ENVIRONMENT}-infrastructure-bucket`,
        removalPolicy: RemovalPolicy.DESTROY
      }
    )
  }
}
