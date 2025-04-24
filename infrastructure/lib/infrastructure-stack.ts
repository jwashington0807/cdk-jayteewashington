import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { InfrastructureStackProps } from '../models/infrastructure';
import { Bucket } from 'aws-cdk-lib/aws-s3';
import { RemovalPolicy } from 'aws-cdk-lib';
import { ApiKey, BasePathMapping, DomainName, EndpointType, LambdaIntegration, LambdaRestApi, Stage, UsagePlan } from 'aws-cdk-lib/aws-apigateway';
import { BaseLambda } from '../src/lambda/lambda-config-base-class';
import { ServicePrincipal } from 'aws-cdk-lib/aws-iam';
import { BaseIam } from '../src/iam/iam-base-class';
import { Certificate, CertificateValidation } from 'aws-cdk-lib/aws-certificatemanager';
import { ARecord, HostedZone, RecordTarget } from 'aws-cdk-lib/aws-route53';
import { ApiGateway } from 'aws-cdk-lib/aws-events-targets';
import * as targets from '@aws-cdk/aws-route53-targets';

export class InfrastructureStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: InfrastructureStackProps) {
    super(scope, id, props);

    const { DEPLOY_ENVIRONMENT, DEPLOY_DOMAIN, HOSTED_ZONE_ID } = props;

    //#region Parameters

    const apiDomain: string = 'api.jayteewashington.com';

    console.log(`Domain Configured - ${DEPLOY_DOMAIN}`);
    console.log(`${DEPLOY_ENVIRONMENT} environment detected`);

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
      roleName: 'SesSenderRole',
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
      roles: emailLambdaRole
    });

    const testfunction = new BaseLambda(this, `jayteewashington-test-lambda`, {
      entry: 'src/lambda/test.ts',
      name: `${DEPLOY_ENVIRONMENT}-jayteewashington-test-lambda`
    });

    //#endregion

    //#region API Gateway

    // Define API Gateway
    const api = new LambdaRestApi(this, `jayteewashington-api-gateway`, {
      handler: lambdafunction,
      proxy: false,
      restApiName: `${DEPLOY_ENVIRONMENT}-jayteewashington-api-gateway`,
      description: `This service is used with an Angular Front-End to process data for the ${DEPLOY_ENVIRONMENT} environment`,
      endpointConfiguration: { types: [ EndpointType.REGIONAL ] },
      defaultCorsPreflightOptions: {
        allowOrigins: ['*'],
      },
      deployOptions: {
        stageName: DEPLOY_ENVIRONMENT
      }
    });

    // Lookup PROD hosted zone for the certificate
    const prodhostedZone = HostedZone.fromHostedZoneAttributes(this, 'APIHostedZone', {zoneName: 'jayteewashington.com', hostedZoneId: HOSTED_ZONE_ID});

    // Creating SSL certificate from PROD and attach to API
    const certificate = new Certificate(
      this,
      "SSLAPICert",
      {
        domainName: apiDomain,
        validation: CertificateValidation.fromDns(prodhostedZone),
        // I will need to manually add a CNAME to the DNS during 1st deployment if it doesn't do it for me

            /*new CnameRecord(this, `${DEPLOY_ENVIRONMENT}-api-gateway-record-set`, {
              zone: hostedZone,
              recordName: 'api',
              domainName: apiDomain
            });*/
      }
    )

    // It will pause here in deployment until Validation is complete

    // Configure Custom Domain for API Gateway
    const apidomainName = new DomainName(this, `${DEPLOY_ENVIRONMENT}-api-gateway-domain`, {
      domainName: apiDomain,
      certificate: certificate,
      endpointType: EndpointType.REGIONAL
    });

    const plan = new UsagePlan(this, 'MyUsagePlan', {
      apiStages: [
        {
          api: api,
            stage: api.deploymentStage,
          },
      ],
    });
    
    const key = new ApiKey(this, 'MyApiKey', {
      description: 'API key'
    });
    
    plan.addApiKey(key);

    // Associate the Custom domain that we created with new APIGateway using BasePathMapping:
    new BasePathMapping(this, `${DEPLOY_ENVIRONMENT}-api-gateway-mapping`, {
      domainName: apidomainName,
      restApi: api
    });

    //#endregion

    //#region Construct Integration and API Resources
    console.log(`${DEPLOY_ENVIRONMENT} Creating Lambda Integration`);

    // Define Lambda Integration
    const contactEmailIntegration = new LambdaIntegration(lambdafunction);
    const testDataIntegration = new LambdaIntegration(testfunction);

    api.root.addResource('email').addMethod('POST', contactEmailIntegration);
    api.root.addResource('test').addMethod('GET', testDataIntegration);

    //#endregion
  }
}
