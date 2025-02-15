#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { jayteewashingtonStack } from '../stacks/cdk-jayteewashington-stack';

// Variables
const app = new cdk.App();
const environment = ['dev', 'prod'];
const deployEnvironment = app.node.tryGetContext('env');

if(!deployEnvironment || !environment.includes(deployEnvironment))
{
    throw new Error('Please inclide env context variable: cdk deploy --context env=dev/prod');
}

let env = app.node.tryGetContext(deployEnvironment);
const infraRepoName = app.node.tryGetContext('cdk-jayteewashington');
const repoOwner = app.node.tryGetContext('jayteewashington');

env = {
    ...env,
    infraRepoName,
    repoOwner,
    description: `Stack for the ${deployEnvironment} CI pipeline deployed using the CDK. If you need to delete this stack, delete the ${deployEnvironment} CDK infrastructure stack first.`
}

// Creation of a new app
new jayteewashingtonStack(app, `JayTeePipelineStack-${deployEnvironment}`, env);

