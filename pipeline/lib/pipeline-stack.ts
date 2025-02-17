import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { PipelineStackProps } from '../models/pipeline';
import { RemovalPolicy, SecretValue, Stack } from 'aws-cdk-lib';
import { CompositePrincipal, PolicyDocument, PolicyStatement, Role, ServicePrincipal } from 'aws-cdk-lib/aws-iam';
import { Bucket } from 'aws-cdk-lib/aws-s3';
import { Artifact, Pipeline } from 'aws-cdk-lib/aws-codepipeline';
import { BuildSpec, LinuxBuildImage, PipelineProject } from 'aws-cdk-lib/aws-codebuild';
import { CodeBuildAction, GitHubSourceAction } from 'aws-cdk-lib/aws-codepipeline-actions';
// import * as sqs from 'aws-cdk-lib/aws-sqs';

export class PipelineStack extends Stack {
  constructor(scope: Construct, id: string, props: PipelineStackProps) {
    super(scope, id, props);

    //#region Console

    // Simple Test to Confirm
    console.log(props);

    // Destructure the props so that we can use the individual variables in this file
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
        removalPolicy: RemovalPolicy.DESTROY
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
    pipeline.addStage({
      stageName: 'Deploy',
      actions: [
        new CodeBuildAction({
          actionName: 'DeployCdkInfrastructure',
          project: infrastructureBuildProject, 
          input: infrastructureSourceOutput,
          role: infrastructureDeployRole
        })
      ]
    })
  
    //#endregion

  }
}
