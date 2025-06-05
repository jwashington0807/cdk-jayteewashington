import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { InfrastructureStackProps } from '../models/infrastructure';
import { Bucket } from 'aws-cdk-lib/aws-s3';
import { RemovalPolicy } from 'aws-cdk-lib';
import { ApiKey, BasePathMapping, Cors, DomainName, EndpointType, LambdaIntegration, LambdaRestApi, RestApi, Stage, UsagePlan } from 'aws-cdk-lib/aws-apigateway';
import { BaseLambda } from '../src/lambda/lambda-config-base-class';
import { ServicePrincipal } from 'aws-cdk-lib/aws-iam';
import { BaseIam } from '../src/iam/iam-base-class';
import { Certificate, CertificateValidation } from 'aws-cdk-lib/aws-certificatemanager';
import { ARecord, HostedZone, RecordTarget } from 'aws-cdk-lib/aws-route53';

export class InfrastructureStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: InfrastructureStackProps) {
    super(scope, id, props);

    const { DEPLOY_ENVIRONMENT, HOSTED_ZONE_ID } = props;

    //#region Parameters

    // Context Variables
    const envContext = this.node.tryGetContext("env");
    const env = this.node.tryGetContext(envContext);

    // Get API Variables
    const apiDomain: string = env.api;
    const apistage: string = 'v1';

    // Get API certificate by ARN
    const certificate = Certificate.fromCertificateArn(this, 'Certificate', env.sslcertarn);

    // Log Info
    console.log(`Domain Configured - ${env.origin}`);
    console.log(`${DEPLOY_ENVIRONMENT} environment detected`);
    console.log(`API Stage: ${apistage}`);

    //#endregion

    //#region S3

    // Create Infrastructure Bucket
    const infrastructureBucket = new Bucket(
      this,
      'InfrastructureBucket', 
      {
        bucketName: `jayteewashington-${DEPLOY_ENVIRONMENT}-infrastructure-bucket`,
        removalPolicy: RemovalPolicy.DESTROY
      }
    );

    //#endregion

    //#region Simple Email Service

    // Create SES Lambda Role
    const emailLambdaRole = new BaseIam(this, 'jayteewashington-ses-role', {
      roleName: `${DEPLOY_ENVIRONMENT}-SesSenderRole`,
      assumedBy: new ServicePrincipal('lambda.amazonaws.com'),
      managedPolicyName: 'AmazonSESFullAccess',
      policyStatementActions: ['logs:CreateLogGroup', 'logs:CreateLogStream', 'logs:PutLogEvents']
    });

    //#endregion
    
    //#region Lambdas

    // Define Lambda Functions
    const lambdafunction = new BaseLambda(this, `jayteewashington-email-lambda`, {
      entry: 'src/lambda/emailnotification.ts',
      name: `${DEPLOY_ENVIRONMENT}-jayteewashington-contact-email`,
      roles: emailLambdaRole,
      environment: {
        URLTO: env.email,
        ORIGIN: env.origin
      }
    });

    const testfunction = new BaseLambda(this, `jayteewashington-test-lambda`, {
      entry: 'src/lambda/test.ts',
      name: `${DEPLOY_ENVIRONMENT}-jayteewashington-test-message`
    });

    //#endregion

    //#region API Gateway

    // Define API Gateway
    const api = new RestApi(this, `jayteewashington-api-gateway`, {
      restApiName: `${DEPLOY_ENVIRONMENT}-jayteewashington-api-gateway`,
      description: `This service is used with an Angular Front-End to process data for the ${DEPLOY_ENVIRONMENT} environment`,
      endpointConfiguration: { types: [ EndpointType.REGIONAL ] },
      deployOptions: {
        stageName: DEPLOY_ENVIRONMENT
      },
      defaultCorsPreflightOptions: {
        allowOrigins: [ env.origin ],
        allowMethods: ['GET', 'POST', 'OPTIONS'],
        allowHeaders: ['Content-Type', 
          'Authorization',
          'Accept',
          'X-Requested-With'
        ],
        allowCredentials: true,
      },
    });

    // Configure Custom Domain for API Gateway
    const apiDomainName = new DomainName(this, `${DEPLOY_ENVIRONMENT}-api-gateway-domain`, {
      domainName: apiDomain,
      certificate: certificate
    });

    // Associate the Custom domain that we created with new APIGateway using BasePathMapping:
    new BasePathMapping(this, `${DEPLOY_ENVIRONMENT}-api-gateway-mapping`, {
      domainName: apiDomainName,
      restApi: api
    });

    //#endregion

    //#region Construct Integration and API Resources

    // Define Lambda Integration
    const contactEmailIntegration = new LambdaIntegration(lambdafunction);
    const testEmailIntegration = new LambdaIntegration(testfunction);

    const versionStage = api.root.addResource(apistage);
    versionStage.addResource('email').addMethod('POST', contactEmailIntegration);
    versionStage.addResource('test').addMethod('GET', testEmailIntegration);

    //#endregion
  }
}
