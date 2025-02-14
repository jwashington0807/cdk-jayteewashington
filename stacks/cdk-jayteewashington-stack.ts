import { CfnOutput, RemovalPolicy, Stack, StackProps } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { NodejsFunction } from 'aws-cdk-lib/aws-lambda-nodejs';
import { Code, LayerVersion, Runtime } from 'aws-cdk-lib/aws-lambda';
import { UserPool, UserPoolClient } from 'aws-cdk-lib/aws-cognito';
import { AuthorizationType, CognitoUserPoolsAuthorizer, LambdaIntegration, LambdaRestApi, RestApi } from 'aws-cdk-lib/aws-apigateway';
import { BaseDynamoDBTable } from '../src/dynamodb/dynamo-base-class';
import { AttributeType } from 'aws-cdk-lib/aws-dynamodb';
import { Effect, ManagedPolicy, Policy, PolicyStatement, Role, ServicePrincipal } from 'aws-cdk-lib/aws-iam';
import { getLambdaDefinitions } from '../src/lambda/config';

export class jayteewashingtonStack extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    // Create DynamoDB table
    const jayteeTable = new BaseDynamoDBTable(this, 'JayTeeTable', {
      partitionKey: {name: 'jtid', type: AttributeType.STRING },
      removalPolicy: RemovalPolicy.DESTROY,
    });

    // Create Default Lambda for Gatway
    // Docker is required for NodejsFunction class
    const defaultFunction = new NodejsFunction(
      this,
      "DefaultJTFunction", 
      {
        runtime: Runtime.NODEJS_LATEST,
        entry: 'src/lambda/handlers/default.ts',
      }
    );

    // Create AWS API Gateway
    const api = new LambdaRestApi(this, 'JayTeeAPI', 
    { 
      handler: defaultFunction,
      proxy: false,
      restApiName: 'JT Gateway',
      description: 'This service processes data using a lambda function',
    });

    // Create Resources
    const accountResource = api.root.addResource('Account');

    // Get Lambda Definitions
    const lambdaDefinitions = getLambdaDefinitions();

    // Create Lambda Functions
    for(const lambdaDefinition of lambdaDefinitions){

      // New Function
      const nsFunction = new NodejsFunction(this, lambdaDefinition.name, {
        runtime: Runtime.NODEJS_LATEST,
        entry: lambdaDefinition.entry
      });

      if(lambdaDefinition.resource == 'Account') {
        lambdaDefinition.method != null ? accountResource.addResource(lambdaDefinition.name).addMethod(lambdaDefinition.method, new LambdaIntegration(nsFunction)) : undefined ;
      }
      else {
        lambdaDefinition.method != null ? api.root.addResource(lambdaDefinition.name).addMethod(lambdaDefinition.method, new LambdaIntegration(nsFunction)) : undefined ;
      }

      // Grant Access to Lambda Function -> DynamoDB Table
      jayteeTable.grantReadWriteData(nsFunction);
    }

    // Create a Cognito User Pool
    const userPool = new UserPool(this, 'JayTeeUserPool', {
      userPoolName: "JayTeeUserPool",
      signInAliases: { email: true }, // Sign In with Email Address
      selfSignUpEnabled: true,
      removalPolicy: RemovalPolicy.DESTROY
    });

    // Create a Cognito User Pool Client
    const userPoolClient = new UserPoolClient(this, 'JayTeeUserPoolClient', {
      userPool, 
      authFlows: { userPassword: true }, // Username + Password Auth
    });

    // Create Client ID to store in App for Testing
    new CfnOutput(this, "clientIDOutput", {
      key: "ClientID",
      value: userPoolClient.userPoolClientId
    });

    // Cognito Authorizer for API Gateway
    /*const authorizer = new CognitoUserPoolsAuthorizer(this, 'CognitoAuthorizer', {
      cognitoUserPools: [ userPool ]
    });*/

    // Create Resource Options
    /*var resourceOptions = {
      authorizer,
      authorizationType: AuthorizationType.COGNITO,
    };*/
    
    // Create Lambda Role for Read Only Access to CloudWatch
    /*const lambdaRole = new Role(this, 'jayTeeLambdaRole', {
      description: `Lambda role for JayTee Website`,
      assumedBy: new ServicePrincipal('lambda.amazonaws.com'),
      managedPolicies: [ManagedPolicy.fromAwsManagedPolicyName('ReadOnlyAccess')]
    });*/

    // Attach Inline Policies to Lambda Role to allow access to CloudWatch
    /*new Policy(this, 'lambdaExecutionAccess', {
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
    });*/
  }
}
