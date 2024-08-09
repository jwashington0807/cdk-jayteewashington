#!/usr/bin/env node
import * as cdk from 'aws-cdk-lib';
import { CdkJayteewashingtonStack } from '../lib/cdk-jayteewashington-stack';

const app = new cdk.App();
new CdkJayteewashingtonStack(app, 'CdkJayteewashingtonStack');
