#!/usr/bin/env node
import * as cdk from 'aws-cdk-lib';
import { InfrastructureStack } from '../lib/infrastructure-stack';

const app = new cdk.App();

if(!process.env.DEPLOY_ENVIRONMENT) throw new Error("DEPLOY_ENVIRONMENT is not defined.");

const DEPLOY_ENVIRONMENT = process.env.DEPLOY_ENVIRONMENT;
const HOSTED_ZONE_ID = app.node.tryGetContext('domainzoneid');

new InfrastructureStack(app, 
  `${DEPLOY_ENVIRONMENT}-Infrastructure-Stack`,
   {
      DEPLOY_ENVIRONMENT,
      HOSTED_ZONE_ID,
      description: `Stack for the ${DEPLOY_ENVIRONMENT} infrastructure deployed using the CI Pipeline. If you need
      to delete everything involving the ${DEPLOY_ENVIRONMENT} environment, delete this stack first, then the CI stack.`
  }
);