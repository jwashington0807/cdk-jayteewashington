import { CfnOutput, RemovalPolicy, SecretValue, Stack } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { NodejsFunction } from 'aws-cdk-lib/aws-lambda-nodejs';
import { Runtime } from 'aws-cdk-lib/aws-lambda';
import { UserPool, UserPoolClient } from 'aws-cdk-lib/aws-cognito';
import { LambdaIntegration, LambdaRestApi, RestApi } from 'aws-cdk-lib/aws-apigateway';
import { BaseDynamoDBTable } from '../src/dynamodb/dynamo-base-class';
import { AttributeType } from 'aws-cdk-lib/aws-dynamodb';
import { getLambdaDefinitions } from '../src/lambda/config';
import { BlockPublicAccess, Bucket } from 'aws-cdk-lib/aws-s3';
import { PipelineStackProps } from '../models/pipeline';
import { CompositePrincipal, PolicyDocument, PolicyStatement, Role, ServicePrincipal } from 'aws-cdk-lib/aws-iam';
import { Artifact, Pipeline } from 'aws-cdk-lib/aws-codepipeline';
import { BuildSpec, LinuxBuildImage, PipelineProject } from 'aws-cdk-lib/aws-codebuild';
import { GitHubSourceAction } from 'aws-cdk-lib/aws-codepipeline-actions';

export class jayteewashingtonStack extends Stack {
  constructor(scope: Construct, id: string, props: PipelineStackProps) {
    super(scope, id, props);

    //#region Console
    // Simple Test
    console.log(props);
    const {
      envName,
      infrastructureRepoName,
      infrastructureBranchName,
      repoOwner
    } = props;
    //#endregion

    //#region Github
    // Get Github Token
    const gitHubToken = SecretValue.secretsManager('github-token');

    // Create new role for github
    const infrastructureDeployRole = new Role(this, "InfrastructureDeployRole", {
      assumedBy: new CompositePrincipal(
        new ServicePrincipal('codebuild.amazonaws.com'),
        new ServicePrincipal('codepipeline.amazonaws.com')
      ),

      // Associate Permissions (Policies) to new role
      inlinePolicies: {
        CdkDeployPermissions: new PolicyDocument({
          statements: [
            new PolicyStatement({
              actions: ['sts:AssumeRole'],
              resources: ['arn:aws:iam::*:role/cdk-*']
            })
          ]
        })
      }
    });

    //#endregion

    //#region Artifacts S3
    // Create S3 Bucket to hold Artifacts
    const artifactBucket = new Bucket(this, `JTArtifactsBucket`,
      {
        bucketName: `jayteewashington-${envName}-codepipeline-artifact-bucket`,
        autoDeleteObjects: true,
      }
    )
    //#endregion

    //#region Pipeline
    // Create new Pipeline Project
    const infrastructureSourceOutput = new Artifact('InfrastructureSourceOutput');

    // Create new Project for Pipeline
    const infrastructureBuildProject = new PipelineProject(
      this,
      'InfrastructureProject',
      {
        role: infrastructureDeployRole,
        environment: {
          buildImage: LinuxBuildImage.AMAZON_LINUX_2_5
        },
        environmentVariables: {
          DEPLOY_ENVIRONMENT: {
            value: envName
          }
        },
        buildSpec: BuildSpec.fromObject({
          version: '0.2',
          phases: {
            install: {
              'runtime-versions': {
                nodejs: '20.x'
              },
              commands: [
                'npm install -g aws-cdk',
                'cd infrastructure',
                'npm install'
              ]
            },
            build: {
              commands: [
                `cdk deploy --context env=${envName}`
              ]
            }
          }
        })
      }
    );

    // Create new Pipeline that will exist in the Project
    const pipeline = new Pipeline(
      this,
      'CIPipeline',
      {
        pipelineName: `${envName}-CI-Pipeline`,
        role: infrastructureDeployRole,
        artifactBucket 
      }
    )

    // Add Source Stage
    pipeline.addStage({
      stageName: 'Source',
      actions: [
        new GitHubSourceAction(
          {
            owner: repoOwner,
            repo: infrastructureRepoName,
            actionName: 'InfrastructureSource',
            branch: infrastructureBranchName,
            output: infrastructureSourceOutput,
            oauthToken: gitHubToken
          }
        )
      ]
    })

    // Add Deployment Stage


    //#endregion


    // Get Context 
    const envContext = this.node.tryGetContext("env");
    const env = this.node.tryGetContext(envContext);

    // Create S3 Bucket to hold Angular out files
    const bucket = new Bucket(this, "JTS3Bucket", {
      bucketName: `JayTeeWebsite-${env}`,
      versioned: true,
      blockPublicAccess: BlockPublicAccess.BLOCK_ALL,
      removalPolicy: RemovalPolicy.DESTROY
    });

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
