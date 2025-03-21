import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { InfrastructureStackProps } from '../models/infrastructure';
import { Bucket } from 'aws-cdk-lib/aws-s3';
import { RemovalPolicy } from 'aws-cdk-lib';
import { LambdaIntegration, RestApi } from 'aws-cdk-lib/aws-apigateway';
import { BaseLambda } from '../src/lambda/lambda-config-base-class';
import { ServicePrincipal } from 'aws-cdk-lib/aws-iam';
import { BaseIam } from '../src/iam/iam-base-class';

export class InfrastructureStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: InfrastructureStackProps) {
    super(scope, id, props);

    const { DEPLOY_ENVIRONMENT } = props;

    console.log(`${DEPLOY_ENVIRONMENT} environment detected. Deploying S3 Bucket`);

    // Create Infrastructure Bucket
    const infrastructureBucket = new Bucket(
      this,
      'InfrastructureBucket', 
      {
        bucketName: `jayteewashington-${DEPLOY_ENVIRONMENT}-infrastructure-bucket`,
        removalPolicy: RemovalPolicy.DESTROY
      }
    );

    // Create SES Lambda Role
    const emailLambdaRole = new BaseIam(this, 'jayteewashington-ses-role', {
      roleName: 'SesSenderRole',
      assumedBy: new ServicePrincipal('lambda.amazonaws.com'),
      managedPolicyName: 'AmazonSESFullAccess',
      policyStatementActions: ['logs:CreateLogGroup', 'logs:CreateLogStream', 'logs:PutLogEvents']
    });

    // Define Lambda Function
    const lambdafunction = new BaseLambda(this, `jayteewashington-email-lambda`, {
      entry: 'src/lambda/emailnotification.ts',
      name: `${DEPLOY_ENVIRONMENT}-jayteewashington-contact-email`,
      roles: emailLambdaRole
    });

    // Define API Gateway
    const api = new RestApi(this, `jayteewashington-api-gateway`, {
      restApiName: `${DEPLOY_ENVIRONMENT}-jayteewashington-api-gateway`,
      description: `This service is used with an Angular Front-End to process data for the ${DEPLOY_ENVIRONMENT} environment`
    });

    // Define Lambda Integration
    const processDataIntegration = new LambdaIntegration(lambdafunction);
    api.root.addResource('email').addMethod('POST', processDataIntegration);
  }
}
