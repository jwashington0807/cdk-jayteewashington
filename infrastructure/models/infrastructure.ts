import { StackProps } from "aws-cdk-lib";
import { HostedZone } from "aws-cdk-lib/aws-route53";

export interface InfrastructureStackProps extends StackProps {
    DEPLOY_ENVIRONMENT: string;
    DEPLOY_DOMAIN: string;
    DEPLOY_CERT_ARN: string;
    DEPLOY_HOSTED_ZONE: string;
}