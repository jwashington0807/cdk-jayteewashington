#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { jayteewashingtonStack } from '../lib/cdk-jayteewashington-stack';

// Creation of a new app
const app = new cdk.App();
new jayteewashingtonStack(app, 'JayTeeStack', {
});

/*export const getContext = async (app: cdk.App): Promise<CDKContext> => {
    return new Promise(async (resolve, reject) => {
        try {
            const currentBranch = await gitbranch();

            const environment = app.node.tryGetContext('environments');
            
            const globals = app.node.tryGetContext('globals');

            return resolve({ ... globals, ... environment});
        }
        catch(error) {
            console.error(error);
            return reject();
        }
    });
};

// Create Stacks
const createStacks = async () =>  {
    try {
        const app = new cdk.App();
        const context = await getContext(app);

        const tags: any = {
            Environment: context.environment
        };

        const stackProps: cdk.StackProps = {
            env: {
                region: context.region
                //account: context.accountNumber
            },
            stackName: `${context.appName}-stack-${context.environment}`,
            description: "Stack",
            tags,
        };

        new jayteewashingtonStack(app, `${context.appName}-stack-${context.environment}`, stackProps, context);
    }
    catch(error) {
        console.log(error);
    }
};

// Starting Point of APP Creation
createStacks();*/