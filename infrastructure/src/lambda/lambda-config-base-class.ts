import { Duration, Stack } from "aws-cdk-lib";
import { NodejsFunction } from "aws-cdk-lib/aws-lambda-nodejs";
import { BaseLambdaProps } from "../../models/lambda";
import { Runtime } from "aws-cdk-lib/aws-lambda";

export class BaseLambda extends NodejsFunction {
    constructor(scope: Stack, id: string, props: BaseLambdaProps) {
        super(scope, id, {
            ...props,
            runtime: Runtime.NODEJS_LATEST,
            entry: props.entry,
            functionName: props.name,
            role: props.roles,
            memorySize: 1024,
            timeout: Duration.seconds(60)
        });
    }
}