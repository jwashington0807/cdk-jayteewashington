import { StackProps } from "aws-cdk-lib";

export interface PipelineStackProps extends StackProps {
    envName: string;
    infrastructureRepoName: string;
    infrastructureBranchName: string;
    repoOwner: string;
    domain: string;
    subdomain: string;
    angularAppRepoName: string;
    angularBranchName: string;
    description: string;
    build: string;
}