import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as iam from 'aws-cdk-lib/aws-iam';
import { Schedule, Rule } from 'aws-cdk-lib/aws-events';
import * as targets from 'aws-cdk-lib/aws-events-targets';
import { Stack, Duration, StackProps } from 'aws-cdk-lib';
import { Construct } from 'constructs';


/**
 * Properties for ScheduledLambdaStack
 */
export interface ScheduledLambdaStackProps extends StackProps {
  /**
   * The schedule for the Lambda function
   * @default Schedule.rate(Duration.minutes(5))
   */
  readonly schedule?: Schedule;

  /**
   * The message to log when Lambda executes
   * @default "Hello, World!"
   */
  readonly message?: string;
}

export class ScheduledLambdaStack extends Stack {
  constructor(scope: Construct, id: string, props: ScheduledLambdaStackProps, ) {
    super(scope, id, props);

    // Create IAM role for Lambda
    const lambdaRole = new iam.Role(this, 'LambdaRole', {
      assumedBy: new iam.ServicePrincipal('lambda.amazonaws.com'),
    });

    // Add basic Lambda execution policy
    lambdaRole.addManagedPolicy(
      iam.ManagedPolicy.fromAwsManagedPolicyName('service-role/AWSLambdaBasicExecutionRole')
    );

    // Create Lambda function
    const lambdaFn = new lambda.Function(this, 'ScheduledLambda', {
      runtime: lambda.Runtime.NODEJS_LATEST,
      handler: 'index.handler',
      timeout: Duration.seconds(10),
      environment: {
        MESSAGE: props.message || "Hello, World!"
      },
      code: lambda.Code.fromInline(`
exports.handler = async function(event, context) {
  console.log(process.env.MESSAGE);
  return {
    statusCode: 200,
    body: process.env.MESSAGE
  };
};
      `),
      role: lambdaRole
    });

    // Create EventBridge rule to schedule Lambda
    const rule = new Rule(this, 'ScheduleRule', {
      schedule: props.schedule || Schedule.rate(Duration.minutes(5))
    });

    // Add Lambda as target for the rule
    rule.addTarget(new targets.LambdaFunction(lambdaFn));
  }
}