import { RoleProps, ServicePrincipal } from "aws-cdk-lib/aws-iam";

export type UserEmail = {
    email: string;
    name: string;
    comments: string;
    reciever: string;
    origin: string;
}

export interface BaseRoleProps extends RoleProps {
    roleName: string;
    managedPolicyName: string;
    policyStatementActions: string[];
}