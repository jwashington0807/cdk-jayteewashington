import { RoleProps, ServicePrincipal } from "aws-cdk-lib/aws-iam";

export interface UserEmail {
    id: string;
    email: string;
    name: string;
    comments: string;
}

export interface IEmailEvent extends UserEmail {
    reciever: string;
}

export interface IConfirmationEvent extends UserEmail {
    recieved: string;
}

export interface BaseRoleProps extends RoleProps {
    roleName: string;
    managedPolicyName: string;
    policyStatementActions: string[];
}