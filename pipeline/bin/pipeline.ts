#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { PipelineStack } from '../lib/pipeline-stack';

// Variables
const app = new cdk.App();
const environment = ['dev', 'prod'];

// env is the parameter that is passed in the CMD by me, JT. 
// --context is the flag used to capture custom parameters
const deployEnvironment = app.node.tryGetContext('env');

// If env was not passed in, throw error
// If env is not equal to any item in the environments array variable, throw error
if(!deployEnvironment || !environment.includes(deployEnvironment))
{
    throw new Error('Please inclide env context variable: cdk deploy --context env=dev/prod');
}

// Get the context object passed
let env = app.node.tryGetContext(deployEnvironment);

// Get variables from cdk.json
const envName = env.env;
const infrastructureBranchName = env.branch;
const infrastructureRepoName = app.node.tryGetContext('infrastructureRepoName');
const repoOwner = app.node.tryGetContext('repositoryOwner');
const domain = app.node.tryGetContext('domain');
const subdomain = env.subdomain;
const angularAppRepoName  = app.node.tryGetContext('angularRepoName');
const angularBranchName  = env.angularBranchName;
const build  = env.build;

env = {
    envName,
    infrastructureRepoName,
    infrastructureBranchName,
    repoOwner,
    domain,
    subdomain,
    angularAppRepoName,
    angularBranchName,
    description: `Stack for the ${deployEnvironment} CI pipeline deployed using the CDK. If you need to delete this stack, delete the ${deployEnvironment} CDK infrastructure stack first.`,
    build
}

// Creation of Pipeline Stack
new PipelineStack(app, `${deployEnvironment}-JayTeePipelineStack`, env);