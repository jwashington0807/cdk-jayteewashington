#!/usr/bin/env node
import * as cdk from 'aws-cdk-lib';
import { InfrastructureStack } from '../lib/infrastructure-stack';

const app = new cdk.App();

if(!process.env.DEPLOY_ENVIRONMENT) throw new Error("DEPLOY_ENVIRONMENT is not defined.");

if(!process.env.DEPLOY_DOMAIN) throw new Error("DEPLOY_DOMAIN is not defined.");

if(!process.env.DEPLOY_CERT_ARN) throw new Error("DEPLOY_CERT_ARN is not defined.");

const DEPLOY_ENVIRONMENT = process.env.DEPLOY_ENVIRONMENT;
const DEPLOY_DOMAIN = process.env.DEPLOY_DOMAIN;
const DEPLOY_CERT_ARN = process.env.DEPLOY_CERT_ARN;

new InfrastructureStack(app, 
  `${DEPLOY_ENVIRONMENT}-Infrastructure-Stack`,
   {
      env: {
        region: process.env.CDK_DEFAULT_REGION,
        account: process.env.CDK_DEPLOY_ACCOUNT,
      },
      DEPLOY_ENVIRONMENT,
      DEPLOY_DOMAIN,
      DEPLOY_CERT_ARN,
      description: `Stack for the ${DEPLOY_ENVIRONMENT} infrastructure deployed using the CI Pipeline. If you need
      to delete everything involving the ${DEPLOY_ENVIRONMENT} environment, delete this stack first, then the CI stack.`
  }
);