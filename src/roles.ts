import * as iam from 'aws-cdk-lib/aws-iam';
import { Construct } from 'constructs';
import { Duration, CfnOutput } from 'aws-cdk-lib';

export interface GitHubOidcRoleProps {
  /**
   * The GitHub organization or user that owns the repository
   */
  readonly owner: string;

  /**
   * The name of the GitHub repository
   */
  readonly repo: string;

  /**
   * Branch to restrict access to, otherwise '*' is all
   * @default '*'
   */
  readonly branch?: string;
}

export class GitHubOidcRole extends Construct {
  public readonly role: iam.Role;
  constructor(scope: Construct, id: string, props: GitHubOidcRoleProps) {
    super(scope, id);

    const provider = new iam.OpenIdConnectProvider(this, 'GitHubProvider', {
      url: 'https://token.actions.githubusercontent.com',
      clientIds: [
        'sts.amazonaws.com',
        `https://github.com/${props.owner}/${props.repo}`
      ]
    });

    this.role = new iam.Role(this, 'GitHubOidcRole', {
      assumedBy: new iam.WebIdentityPrincipal(provider.openIdConnectProviderArn, {
        StringEquals: {
          'token.actions.githubusercontent.com:aud': 'sts.amazonaws.com'
        },
        StringLike: {
          'token.actions.githubusercontent.com:sub': `repo:${props.owner}/${props.repo}:ref:refs/heads/${props.branch}`
        }
      }),
      // roleName: 'github-actions-role'      
      managedPolicies: [
        iam.ManagedPolicy.fromAwsManagedPolicyName('AdministratorAccess')
      ],
      maxSessionDuration: Duration.hours(1),
      description: 'Allows deployment through for GitHub Actions'
    });

    new CfnOutput(this, 'RoleArn', {
      value: this.role.roleArn,
      description: 'GitHub OIDC Role ARN'
    });
  }
}
