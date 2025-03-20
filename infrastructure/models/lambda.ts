import { Role } from "aws-cdk-lib/aws-iam";
import { NodejsFunctionProps } from "aws-cdk-lib/aws-lambda-nodejs";

export interface BaseLambdaProps extends NodejsFunctionProps {
    entry: string;
    name: string;
    roles?: Role;
}