import { RemovalPolicy, Stack, StackProps } from 'aws-cdk-lib';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import { RestApi } from 'aws-cdk-lib/aws-apigateway';
import { Construct } from 'constructs';
import { CDKContext } from '../types';
import * as iam from 'aws-cdk-lib/aws-iam';
import { getFunctionProps, getLambdaDefinitions } from './lambda-config';
import { NodejsFunction } from 'aws-cdk-lib/aws-lambda-nodejs';
import * as cwLogs from 'aws-cdk-lib/aws-logs';

export class jayteewashingtonStack extends Stack {
  constructor(scope: Construct, id: string, props: StackProps, context: CDKContext) {
    super(scope, id, props);

    // Create Lambda Role for Read Only Access
    const lambdaRole = new iam.Role(this, 'lambdaRole', {
      roleName: `${context.appName}-stack-${context.environment}`,
      description: `Lambda role for ${context.appName}`,
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

    // Create a Lambda Layer to hold funtions for all lambdas
    const lambdaLayer = new lambda.LayerVersion(this, 'lambdalayer', {
      code: lambda.Code.fromAsset('lambda-layer'),
      compatibleRuntimes: [lambda.Runtime.NODEJS_20_X],
      description: 'Lambda Layer for ${context.appName}',
    });


    // Get Lambda Definitions
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
    }

    // defines a AWS API Gateway
    /*const api = new RestApi(this, 'jayteewashington', 
    { 
      description: 'API developed for use with the jayteewashington serverless application'
    });*/
  }
}
