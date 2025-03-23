import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { PipelineStackProps } from '../models/pipeline';
import { RemovalPolicy, Stack } from 'aws-cdk-lib';
import { CompositePrincipal, PolicyDocument, PolicyStatement, Role, ServicePrincipal } from 'aws-cdk-lib/aws-iam';
import { Bucket } from 'aws-cdk-lib/aws-s3';
import { Artifact, Pipeline } from 'aws-cdk-lib/aws-codepipeline';
import { BuildSpec, LinuxBuildImage, PipelineProject, Cache, LocalCacheMode } from 'aws-cdk-lib/aws-codebuild';
import { CodeBuildAction, GitHubSourceAction, S3DeployAction } from 'aws-cdk-lib/aws-codepipeline-actions';
import { ARecord, HostedZone, RecordTarget } from 'aws-cdk-lib/aws-route53';
import { Certificate, CertificateValidation } from 'aws-cdk-lib/aws-certificatemanager';
import { Distribution, OriginAccessIdentity, ViewerProtocolPolicy } from 'aws-cdk-lib/aws-cloudfront';
import { S3BucketOrigin} from 'aws-cdk-lib/aws-cloudfront-origins';
import { ApiGatewayDomain, CloudFrontTarget } from 'aws-cdk-lib/aws-route53-targets';
import { Secret } from 'aws-cdk-lib/aws-secretsmanager';

export class PipelineStack extends Stack {
  constructor(scope: Construct, id: string, props: PipelineStackProps) {
    super(scope, id, props);

    //#region Props
    // Destructure the props so that we can use the individual variables in this file
    const {
      envName,
      infrastructureRepoName,
      infrastructureBranchName,
      repoOwner,
      domain,
      subdomain,
      angularAppRepoName,
      angularBranchName,
      description,
      certARN
    } = props;

    //#endregion

    //#region Github

    // Get Github Token
    const gitHubToken = Secret.fromSecretAttributes(this, "github-token", {
      secretCompleteArn:
        "arn:aws:secretsmanager:us-east-1:700081520826:secret:github-token-UG7mOa"
    });

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

    //#region S3 Buckets

    // Creaate S3 Bucket to hold Angular Files
    const angularBucket = new Bucket(this, 'JTAppBucket',
      {
        bucketName: `jayteewashington-${envName}-frontend-angular-bucket`,
        autoDeleteObjects: true,
        removalPolicy: RemovalPolicy.DESTROY
      }
    );

    // Create S3 Bucket to hold Artifacts
    const artifactBucket = new Bucket(this, 'JTArtifactsBucket',
      {
        bucketName: `jayteewashington-${envName}-codepipeline-artifact-bucket`,
        autoDeleteObjects: true,
        removalPolicy: RemovalPolicy.DESTROY
      }
    );
    //#endregion

    //#region Domain

    // concat the domain name. If prod, the subdomain will be blank. Taken from the cdk.json file
    const domainName = `${subdomain}${domain}`;

    // creating a hosted zone for the certificate and other items needed for this application
    const hostedZone = new HostedZone(
      this,
      "HostedZone",
      {
        zoneName: domainName
      }
    );

    // Creating SSL certificate
    const certificate = new Certificate(
      this,
      "SSLCert",
      {
        domainName,
        validation: CertificateValidation.fromDns(hostedZone)
      }
    )

    // Only access into the App should be through CloudFront. Granting only READ to S3 bucket
    const originAccessIdentity = new OriginAccessIdentity(
      this,
      'OriginAccessIdentity'
    );

    angularBucket.grantRead(originAccessIdentity);

    //#endregion

    //#region CloudFront
  
    const distribution = new Distribution(
      this,
      `JTCloudFrontApplication`,
      {
        defaultRootObject: 'index.html',
        defaultBehavior: {
          origin: S3BucketOrigin.withOriginAccessControl(angularBucket),
          viewerProtocolPolicy: ViewerProtocolPolicy.REDIRECT_TO_HTTPS
        },
        domainNames: [domainName],
        certificate
      }
    );

    // Creation of Records
    const arecord = new ARecord(
      this,
      'ARecord',
      {
        zone: hostedZone,
        target: RecordTarget.fromAlias(new CloudFrontTarget(distribution))
      }
    )

    //#endregion

    //#region Artifacts

    // Create Artifacts
    const infrastructureSourceOutput = new Artifact('InfrastructureSourceOutput');
    const angularSourceOutput = new Artifact('AngularSourceOutput');
    const angularBuildOutput = new Artifact('AngularBuildOutput');

    //#endregion

    //#region Angular Pipeline Project

    const angularPipelineBuildProject = new PipelineProject(
      this,
      'angularBuildProject',
      {
        environment: {
          buildImage: LinuxBuildImage.AMAZON_LINUX_2_5
        },
        buildSpec: BuildSpec.fromObject({
          version: '0.2',
          phases: {
            install: {
              'runtime-versions': {
                nodejs: '20.x'
              },
              commands: [
                'npm install',
                'npm install -g @angular/cli'
              ]
            },
            build: {
              commands: [
                'echo Building Angular Application...',
                `ng build --configuration development`
              ]
            }
          },
          artifacts: {
            files: '**/*',
            'base-directory': 'dist/browser'
          },
          cache: {
            paths: [
              'node_modules/**/*'
            ]
          }
        }),
        cache: Cache.local(LocalCacheMode.CUSTOM)
      }
    )

    //#endregion

    //#region Infrastructure Pipeline Project

    const infrastructureBuildProject = new PipelineProject(
      this,
      'InfrastructureProject',
      {
        role: infrastructureDeployRole,
        environment: {
          buildImage: LinuxBuildImage.AMAZON_LINUX_2_5 // for some reason, if not stated, it'll use Node version from the past
        },
        environmentVariables: {
          DEPLOY_ENVIRONMENT: {
            value: envName
          },
          DEPLOY_DOMAIN: {
            value: domainName
          },
          DEPLOY_CERT_ARN: {
            value: certARN
          },
          DEPLOY_HOSTED_ZONE: {
            value: hostedZone.hostedZoneId
          }
        },
        buildSpec: BuildSpec.fromObject({
          version: '0.2',
          env: {
            account: process.env.CDK_DEFAULT_ACCOUNT,
            region: process.env.CDK_DEFAULT_REGION
          },
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

    //#endregion

    //#region Pipeline

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
            repo: angularAppRepoName,
            actionName: 'AngularSource',
            branch: angularBranchName,
            output: angularSourceOutput,
            oauthToken: gitHubToken.secretValue
          }
        ),
        new GitHubSourceAction(
          {
            owner: repoOwner,
            repo: infrastructureRepoName,
            actionName: 'InfrastructureSource',
            branch: infrastructureBranchName,
            output: infrastructureSourceOutput,
            oauthToken: gitHubToken.secretValue
          }
        )
      ]
    })

    // Add Build Stage
    pipeline.addStage({
      stageName: 'Build',
      actions: [
        new CodeBuildAction({
          actionName: 'BuildAngular',
          project: angularPipelineBuildProject, 
          input: angularSourceOutput,
          outputs: [ angularBuildOutput ]
        })
      ]
    });

    // Add Deployment Stage
    pipeline.addStage({
      stageName: 'Deploy',
      actions: [
        new S3DeployAction({
          actionName: 'DeployAngularApp',
          bucket: angularBucket,
          input: angularBuildOutput,
          extract: true // pulls everything out of the dist folder and into the root directory of S3 bucket
        }),
        new CodeBuildAction({
          actionName: 'DeployCdkInfrastructure',
          project: infrastructureBuildProject, 
          input: infrastructureSourceOutput,
          role: infrastructureDeployRole
        })
      ]
    });
  
    //#endregion
  }
}
