import { Stack } from "aws-cdk-lib";
import { ManagedPolicy, PolicyStatement, Role, ServicePrincipal } from "aws-cdk-lib/aws-iam";
import { BaseRoleProps } from "../../models/ses";

export class BaseIam extends Role {
    constructor(scope: Stack, id: string, props: BaseRoleProps) {
        super(scope, id, {
            ...props,
            roleName: props.roleName
        });

        // Configure Managed Policy
        this.addManagedPolicy(ManagedPolicy.fromAwsManagedPolicyName(props.managedPolicyName));

        // Configure CloudWatch Logs Policy
        this.addToPrincipalPolicy(new PolicyStatement({actions: props.policyStatementActions, resources: ['*']}));
    }
}