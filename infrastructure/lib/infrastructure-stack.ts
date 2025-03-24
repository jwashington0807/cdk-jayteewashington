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
import { ARecord, CnameRecord, HostedZone, RecordTarget } from 'aws-cdk-lib/aws-route53';
import { ApiGatewayv2DomainProperties } from 'aws-cdk-lib/aws-route53-targets';
import { TLSSecurityPolicy } from 'aws-cdk-lib/aws-opensearchservice';
import { Domain } from 'domain';

export class InfrastructureStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: InfrastructureStackProps) {
    super(scope, id, props);

    const { DEPLOY_ENVIRONMENT, DEPLOY_DOMAIN, DEPLOY_CERT_ARN, DEPLOY_HOSTED_ZONE } = props;

    //#region Parameters

    const apiDomain: string = 'api.jayteewashington.com';

    /*if(DEPLOY_ENVIRONMENT == 'dev') {
      apiDomain = 'api.jayteewashington.com';
    }
    else if(DEPLOY_ENVIRONMENT == 'prod') {
      apiDomain = 'api.jayteewashington.com';
    }
    else {
      apiDomain = 'api.jayteewashington.com';
    }*/

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
      },
      deployOptions: {
        stageName: DEPLOY_ENVIRONMENT
      }
    });

    // Lookup hosted zone for the certificate
    const hostedZone = HostedZone.fromHostedZoneAttributes(this, 'APIHostedZone', {zoneName: 'jayteewashington.com', hostedZoneId: DEPLOY_HOSTED_ZONE});
    /*const hostedZone = new HostedZone(
      this,
      "HostedZone",
      {
        zoneName: apiDomain
      }
    );*/

    // Creating SSL certificate
    const certificate = new Certificate(
      this,
      "SSLAPICert",
      {
        domainName: apiDomain,
        validation: CertificateValidation.fromDns(hostedZone),
        // I will need to manually add a CNAME to the DNS during 1st deployment if it doesn't do it for me

            /*new CnameRecord(this, `${DEPLOY_ENVIRONMENT}-api-gateway-record-set`, {
              zone: hostedZone,
              recordName: 'api',
              domainName: apiDomain
            });*/
      }
    )

    // Need to manually create a NS record for the api url in the prod hosted zone
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

    /*const apidomainName = DomainName.fromDomainNameAttributes(this, 'domain-name', {
      domainName: 'jayteewashington.com',
      domainNameAliasTarget: apiDomain,
      domainNameAliasHostedZoneId: hostedZone.hostedZoneId
    });*/

    // Associate the Custom domain that we created with new APIGateway using BasePathMapping:
    new BasePathMapping(this, `${DEPLOY_ENVIRONMENT}-api-gateway-mapping`, {
      domainName: apidomainName,
      restApi: api
    });

    // Creation of AUTHORITATIVE Record
    /*const arecord = new ARecord(
      this,
      'AapiRecord',
      {
        recordName: apiDomain,
        region: 'us-east-1',
        zone: hostedZone,
        target: RecordTarget.fromAlias(new ApiGatewayv2DomainProperties(apiDomain, hostedZone.hostedZoneId))
      }
    )*/

    //#endregion

    //#region Construct Integration
    console.log(`${DEPLOY_ENVIRONMENT} Creating Lambda Integration`);
    // Define Lambda Integration
    const processDataIntegration = new LambdaIntegration(lambdafunction);
    api.root.addResource('email').addMethod('POST', processDataIntegration);

    //#endregion
  }
}
