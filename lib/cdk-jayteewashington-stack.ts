import { RemovalPolicy, Stack, StackProps } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { CDKContext } from '../types';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as cognito from 'aws-cdk-lib/aws-cognito';

export class jayteewashingtonStack extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    // Create a Codnito User Pool
    const userPool = new cognito.UserPool(this, 'JayTeeUserPool', {
      signInAliases: { email: true }, // Sign In with Email Address
      selfSignUpEnabled: true,
    });

    // Create a Cognito User Pool Client
    const userPoolClient = new cognito.UserPoolClient(this, 'JayTeeUserPoolClient', {
      userPool, 
      authFlows: { userPassword: true }, // Username + Password Auth
    });

    // Create DynamoDB table
    const jayteeTable = new dynamodb.Table(this, 'JayTeeTable', {
      partitionKey: {name: 'id', type: dynamodb.AttributeType.STRING },
      removalPolicy: RemovalPolicy.DESTROY,
    });

    // Create Lambda Function
    const apiLamdba = new lambda.Function(this, 'SignUp', {
      runtime: lambda.Runtime.NODEJS_LATEST,
      code: lambda.Code.fromAsset('lambda'),
      handler: 'signup.handler',
      environment: {
        JAYTEE_TABLE_NAME: jayteeTable.tableName,
      }
    });

    // Create AWS API Gateway
    const api = new apigateway.LambdaRestApi(this, 'JayTeeAPIGateway', 
    { 
      handler: apiLamdba,
      proxy: false,
    });

    // Create Lambda Integration
    var lambdaintegration = new apigateway.LambdaIntegration(apiLamdba);

    // Cognito Authorizer for API Gateway
    const authorizer = new apigateway.CognitoUserPoolsAuthorizer(this, 'CognitoAuthorizer', {
      cognitoUserPools: [ userPool ]
    });

    // Create Resource Options
    var resourceOptions = {
      authorizer,
      authorizationType: apigateway.AuthorizationType.COGNITO,
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
    const lambdaRole = new iam.Role(this, 'jayTeeLambdaRole', {
      description: `Lambda role for JayTee Website`,
      assumedBy: new iam.ServicePrincipal('lambda.amazonaws.com'),
      managedPolicies: [iam.ManagedPolicy.fromAwsManagedPolicyName('ReadOnlyAccess')]
    });

    // Attach Inline Policies to Lambda Role to allow access to CloudWatch
    new iam.Policy(this, 'lambdaExecutionAccess', {
      policyName: 'lambdaexecutionaccess',
      statements: [
        new iam.PolicyStatement({
          effect: iam.Effect.ALLOW,
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

  /*
    // Create a Lambda Layer to hold funtions for all lambdas
    const lambdaLayer = new lambda.LayerVersion(this, 'lambdalayer', {
      code: lambda.Code.fromAsset('lambda-layer'),
      compatibleRuntimes: [lambda.Runtime.NODEJS_20_X],
      description: 'Lambda Layer for ${context.appName}',
    });

    const lambdaDefinitions = getLambdaDefinitions(context);

    // Loop through the definitions and create lambda functions
    for (const lambdaDefinition of lambdaDefinitions) {
      // Get function props based on lambda definition
      let functionProps = getFunctionProps(lambdaDefinition, lambdaRole, lambdaLayer, context);

      // Lambda Function
      new NodejsFunction(this, `${lambdaDefinition.name}-function`, functionProps);
  
      // Create corresponding log group with one day retention
      new cwLogs.LogGroup(this, `fn-${lambdaDefinition.name}-log-group`, {
        logGroupName: `/aws/lambda/${context.appName}-${lambdaDefinition.name}-${context.environment}`,
        retention: cwLogs.RetentionDays.ONE_DAY,
        removalPolicy: RemovalPolicy.DESTROY,
      });
    }*/
  }
}
