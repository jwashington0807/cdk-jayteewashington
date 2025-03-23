import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { InfrastructureStackProps } from '../models/infrastructure';
import { Bucket } from 'aws-cdk-lib/aws-s3';
import { RemovalPolicy } from 'aws-cdk-lib';
import { BasePathMapping, DomainName, EndpointType, LambdaIntegration, LambdaRestApi, RestApi } from 'aws-cdk-lib/aws-apigateway';
import { BaseLambda } from '../src/lambda/lambda-config-base-class';
import { ServicePrincipal } from 'aws-cdk-lib/aws-iam';
import { BaseIam } from '../src/iam/iam-base-class';
import { Certificate, CertificateValidation } from 'aws-cdk-lib/aws-certificatemanager';
import { ARecord, CnameRecord, HostedZone, RecordTarget } from 'aws-cdk-lib/aws-route53';
import { ApiGatewayv2DomainProperties } from 'aws-cdk-lib/aws-route53-targets';

export class InfrastructureStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: InfrastructureStackProps) {
    super(scope, id, props);

    const { DEPLOY_ENVIRONMENT, DEPLOY_DOMAIN, DEPLOY_CERT_ARN, DEPLOY_HOSTED_ZONE } = props;

    console.log(`Domain Configured - ${DEPLOY_DOMAIN}`);
    console.log(`${DEPLOY_ENVIRONMENT} environment detected. Deploying S3 Bucket`);

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
      roleName: 'SesSenderRole',
      assumedBy: new ServicePrincipal('lambda.amazonaws.com'),
      managedPolicyName: 'AmazonSESFullAccess',
      policyStatementActions: ['logs:CreateLogGroup', 'logs:CreateLogStream', 'logs:PutLogEvents']
    });

    //#endregion
    
    //#region Lambdas

    // Define Lambda Function
    const lambdafunction = new BaseLambda(this, `jayteewashington-email-lambda`, {
      entry: 'src/lambda/emailnotification.ts',
      name: `${DEPLOY_ENVIRONMENT}-jayteewashington-contact-email`,
      roles: emailLambdaRole
    });

    //#endregion

    //#region API Gateway

    // Define API Gateway
    const api = new LambdaRestApi(this, `jayteewashington-api-gateway`, {
      handler: lambdafunction,
      proxy: false,
      restApiName: `${DEPLOY_ENVIRONMENT}-jayteewashington-api-gateway`,
      description: `This service is used with an Angular Front-End to process data for the ${DEPLOY_ENVIRONMENT} environment`,
      defaultCorsPreflightOptions: {
        allowOrigins: ['http://localhost:4200'],
      }
    });

    // concat the domain name. If prod, the subdomain will be blank. Taken from the cdk.json file
    const domainName = `api.${DEPLOY_DOMAIN}`;

    // creating a hosted zone for the certificate and other items needed for this application
    const hostedZone = new HostedZone(
      this,
      "APIHostedZone",
      {
        zoneName: domainName
      }
    );

    // Creating SSL certificate
    const certificate = new Certificate(
      this,
      "SSLAPICert",
      {
        domainName,
        validation: CertificateValidation.fromDns(hostedZone)
      }
    )

    // Configure new custom URL for API calls
    const apidomainName = new DomainName(this, `${DEPLOY_ENVIRONMENT}-api-gateway-domain`, {
      domainName: `api.${DEPLOY_DOMAIN}`,
      certificate: certificate,
      endpointType: EndpointType.EDGE
    });

    // Associate the Custom domain that we created with new APIGateway using BasePathMapping:
    new BasePathMapping(this, `${DEPLOY_ENVIRONMENT}-api-gateway-mapping`, {
      domainName: apidomainName,
      restApi: api
    });

    new CnameRecord(this, `${DEPLOY_ENVIRONMENT}-api-gateway-record-set`, {
      zone: hostedZone,
      recordName: 'api',
      domainName: apidomainName.domainNameAliasDomainName
    });

    //#endregion

    //#region Construct Integration
    console.log(`${DEPLOY_ENVIRONMENT} Creating Lambda Integration`);
    // Define Lambda Integration
    const processDataIntegration = new LambdaIntegration(lambdafunction);
    api.root.addResource('email').addMethod('POST', processDataIntegration);

    //#endregion
  }
}
