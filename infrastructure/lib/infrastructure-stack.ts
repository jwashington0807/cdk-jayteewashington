import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { InfrastructureStackProps } from '../models/infrastructure';
import { Bucket } from 'aws-cdk-lib/aws-s3';
import { RemovalPolicy } from 'aws-cdk-lib';
import { EndpointType, LambdaIntegration, LambdaRestApi, RestApi } from 'aws-cdk-lib/aws-apigateway';
import { BaseLambda } from '../src/lambda/lambda-config-base-class';
import { ServicePrincipal } from 'aws-cdk-lib/aws-iam';
import { BaseIam } from '../src/iam/iam-base-class';
import { Certificate } from 'aws-cdk-lib/aws-certificatemanager';
import { ARecord, HostedZone, RecordTarget } from 'aws-cdk-lib/aws-route53';
import { ApiGatewayv2DomainProperties } from 'aws-cdk-lib/aws-route53-targets';

export class InfrastructureStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: InfrastructureStackProps) {
    super(scope, id, props);

    const { DEPLOY_ENVIRONMENT, DEPLOY_DOMAIN, DEPLOY_CERT_ARN, DEPLOY_HOSTED_ZONE } = props;

    console.log(`Domain Configured - ${DEPLOY_DOMAIN}`);
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
    const api = new LambdaRestApi(this, `jayteewashington-api-gateway`, {
      handler: lambdafunction,
      proxy: false,
      restApiName: `${DEPLOY_ENVIRONMENT}-jayteewashington-api-gateway`,
      description: `This service is used with an Angular Front-End to process data for the ${DEPLOY_ENVIRONMENT} environment`,
      defaultCorsPreflightOptions: {
        allowOrigins: ['http://localhost:4200'],
      },
      domainName: {
        domainName: `${DEPLOY_DOMAIN}`,
        certificate: Certificate.fromCertificateArn(
          this,
          "SSLCert",
          `${DEPLOY_CERT_ARN}`
        ),
        endpointType: EndpointType.REGIONAL,
      }
    });

    // Retrieve the Hosted Zone from Pipeline Stack
    const zone = HostedZone.fromHostedZoneAttributes(this, `jayteewashingtonZone`, { hostedZoneId: DEPLOY_HOSTED_ZONE, zoneName: DEPLOY_DOMAIN });

    // Create A Record to go to hosted zone
    const arecord = new ARecord(this, `${DEPLOY_ENVIRONMENT}-api-gateway-arecord`, {
      zone: zone,
      target: RecordTarget.fromAlias(new ApiGatewayv2DomainProperties(`${DEPLOY_DOMAIN}`, zone.hostedZoneId))
    })

    console.log(`${DEPLOY_ENVIRONMENT} Creating Lambda Integration`);
    // Define Lambda Integration
    const processDataIntegration = new LambdaIntegration(lambdafunction);
    api.root.addResource('email').addMethod('POST', processDataIntegration);
  }
}
