import { StackProps } from "aws-cdk-lib";

export interface InfrastructureStackProps extends StackProps {
    DEPLOY_ENVIRONMENT: string;
}