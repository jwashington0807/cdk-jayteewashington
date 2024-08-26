import { LambdaDefinition, CDKContext } from "../types";
import { NodejsFunctionProps } from "aws-cdk-lib/aws-lambda-nodejs";
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as iam from 'aws-cdk-lib/aws-iam';
import { Duration } from "aws-cdk-lib";

// Constants
const DEFAULT_LAMBDA_MEMORY_MB = 1024;
const DEFAULT_LAMBDA_TIMEOUT_MINS = 15;


export const getLambdaDefinitions = (context: CDKContext): LambdaDefinition[] => {
    const lambdadefinitions: LambdaDefinition[] = [
        {
            name: 'userlogin',
            environment: {
                REGION: context.region,
                ENV: context.environment,
                GIT_BRANCH: context.branchName,
            },
            isPrivate: false
        },
        {
            name: 'contact',
            memoryMB: 2048,
            timeoutMins: 5,
            environment: {
                REGION: context.region,
                ENV: context.environment,
                GIT_BRANCH: context.branchName,
            },
            isPrivate: true
        }
    ]

    return lambdadefinitions;
}

// Returns Lambda function props with defaults and overwrites
export const getFunctionProps = (
    lambdaDefinition: LambdaDefinition,
    lambdaRole: iam.Role,
    lambdaLayer: lambda.LayerVersion,
    context: CDKContext
): NodejsFunctionProps => {
    const functionProps: NodejsFunctionProps = {
        functionName: `${context.appName}-${lambdaDefinition.name}-${context.environment}`,
        entry: `lambda/${lambdaDefinition.name}.ts`,
        runtime: lambda.Runtime.NODEJS_20_X,
        memorySize: lambdaDefinition.memoryMB ? lambdaDefinition.memoryMB : DEFAULT_LAMBDA_MEMORY_MB,
        timeout: lambdaDefinition.timeoutMins ? Duration.minutes(lambdaDefinition.timeoutMins) : Duration.minutes(DEFAULT_LAMBDA_TIMEOUT_MINS),
        environment: lambdaDefinition.environment,
        role: lambdaRole,
        layers: [lambdaLayer],
    };

    return functionProps;
};