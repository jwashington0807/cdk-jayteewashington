#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { jayteewashingtonStack } from '../stacks/cdk-jayteewashington-stack';

// Creation of a new app
const app = new cdk.App();
    new jayteewashingtonStack(app, 'JayTeeStack', {
});