import { RemovalPolicy, Stack, StackProps } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { NodejsFunction } from 'aws-cdk-lib/aws-lambda-nodejs';
import { Code, LayerVersion, Runtime } from 'aws-cdk-lib/aws-lambda';
import { UserPool, UserPoolClient } from 'aws-cdk-lib/aws-cognito';
import { AuthorizationType, CognitoUserPoolsAuthorizer, LambdaIntegration, RestApi } from 'aws-cdk-lib/aws-apigateway';
import { BaseDynamoDBTable } from '../src/dynamodb/dynamo-base-class';
import { AttributeType } from 'aws-cdk-lib/aws-dynamodb';
import { Effect, ManagedPolicy, Policy, PolicyStatement, Role, ServicePrincipal } from 'aws-cdk-lib/aws-iam';

export class jayteewashingtonStack extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    // Initiate Lambda Layer
    /*const layer = new LayerVersion(
      this,
      "Layer",
      {
        code: Code.fromAsset('src/lambda/layers'),
        compatibleRuntimes: [ Runtime.NODEJS_LATEST ],
        layerVersionName: "NodeJSLayer"
      }
    )*/

    // Create a Codnito User Pool
    const userPool = new UserPool(this, 'JayTeeUserPool', {
      signInAliases: { email: true }, // Sign In with Email Address
      selfSignUpEnabled: true,
    });

    // Create a Cognito User Pool Client
    const userPoolClient = new UserPoolClient(this, 'JayTeeUserPoolClient', {
      userPool, 
      authFlows: { userPassword: true }, // Username + Password Auth
    });

    // Create DynamoDB table
    const jayteeTable = new BaseDynamoDBTable(this, 'JayTeeTable', {
      partitionKey: {name: 'id', type: AttributeType.STRING },
      removalPolicy: RemovalPolicy.DESTROY,
    });

    // Create Lambda Function
    const apiLamdba = new NodejsFunction(this, 'ProcessDataFunction', {
      runtime: Runtime.NODEJS_LATEST,
      entry: 'src/lambda/handlers/process-data.ts',
      environment: {
        LOG_LEVEL: 'INFO',
      }/*,
      layers: [
        layer
      ]*/
    });

    // Create AWS API Gateway
    const api = new RestApi(this, 'JayTeeAPI', 
    { 
      restApiName: 'Process Data Service',
      description: 'This service processes data using a lambda function',
    });

    // Create Lambda Integration with API Gateway
    var lambdaintegration = new LambdaIntegration(apiLamdba);
    api.root.addResource('data').addMethod('POST', lambdaintegration);

    // Cognito Authorizer for API Gateway
    const authorizer = new CognitoUserPoolsAuthorizer(this, 'CognitoAuthorizer', {
      cognitoUserPools: [ userPool ]
    });

    // Create Resource Options
    var resourceOptions = {
      authorizer,
      authorizationType: AuthorizationType.COGNITO,
    };

    // Add Resources for items
    const jayteeResource = api.root.addResource('items');
    jayteeResource.addMethod('POST', lambdaintegration, resourceOptions);
    jayteeResource.addMethod('PUT', lambdaintegration, resourceOptions);
    jayteeResource.addMethod('DELETE', lambdaintegration, resourceOptions);
    jayteeResource.addMethod('GET', lambdaintegration, resourceOptions);
    jayteeResource.addMethod('OPTIONS', lambdaintegration);

    // Grant Access to Lambda Function -> DynamoDB Table
    jayteeTable.grantReadWriteData(apiLamdba);
    
    // Create Lambda Role for Read Only Access to CloudWatch
    const lambdaRole = new Role(this, 'jayTeeLambdaRole', {
      description: `Lambda role for JayTee Website`,
      assumedBy: new ServicePrincipal('lambda.amazonaws.com'),
      managedPolicies: [ManagedPolicy.fromAwsManagedPolicyName('ReadOnlyAccess')]
    });

    // Attach Inline Policies to Lambda Role to allow access to CloudWatch
    new Policy(this, 'lambdaExecutionAccess', {
      policyName: 'lambdaexecutionaccess',
      statements: [
        new PolicyStatement({
          effect: Effect.ALLOW,
          resources: ['*'],
          actions: [
            'logs:CreateLogGroup',
            'logs:CreateLogStream',
            'logs:DescribeLogGroups',
            'logs:DescribeLogStreams',
            'logs:PutLogEvents',
          ]
        })
      ]
    });
  }
}
