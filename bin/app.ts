import { App, Stack, Duration } from 'aws-cdk-lib';
import { Schedule } from 'aws-cdk-lib/aws-events';
import { GitHubOidcRole } from '../src/roles';
import { ScheduledLambdaStack } from '../src/main';

// Define Environments for CDK
// For this example, dev and prod are the same AWS account and region. The values are pulled from your environment.
const devEnv = {
  account: process.env.CDK_DEFAULT_ACCOUNT,
  region: process.env.CDK_DEFAULT_REGION,
};

const prodEnv = {
  account: process.env.CDK_DEFAULT_ACCOUNT,
  region: process.env.CDK_DEFAULT_REGION,
};

// Define app
const app = new App();


// In this example, we create an empty Stack and add a Construct
// to it. Stacks can stand alone with app as scope, but constructs need
// to be in the scope of a Stack.
const DevStack = new Stack(app, 'DevStack', { env: devEnv });

// Add GH actions role in dev
new GitHubOidcRole(DevStack, 'devEnv-github-actions-role', {
  owner: 'jayteewashington',
  repo: 'cdk-jayteewashington'
});

// Add a simple Lambda App as the "main" stack. It is nested in the DevStack we created.
new ScheduledLambdaStack(DevStack, 'ScheduledLambdaStack', {
  // schedule: Schedule.rate(Duration.minutes(5)), // This is default
  message: 'Hello, Dev!'
});

// However, we can also create a standalone Stack for the Lambda Stack
new ScheduledLambdaStack(app, 'StandAloneLambdaStack', { env: devEnv });


// Now in prod we deploy the same but with different props for the Lambda Stack
const ProdStack = new Stack(app, 'ProdStack', { env: prodEnv });
new GitHubOidcRole(ProdStack, 'prodEnv-github-actions-role', {
  owner: 'jayteewashington',
  repo: 'cdk-jayteewashington'
});
// Hello Production
new ScheduledLambdaStack(ProdStack, 'ScheduledLambdaStack', {
  schedule: Schedule.rate(Duration.minutes(10)),
  message: 'Hello, Prod!'
});


app.synth();