

describe('Initial test suite', () => {

 test('Cognito Test', () => {

  expect(true).toBeTruthy();
 });

});

/*test('SQS Queue and SNS Topic Created', () => {
  const app = new cdk.App();
  // WHEN
  const stack = new CdkJayteewashington.jayteewashingtonStack(app, 'MyTestStack');
  // THEN

  const template = Template.fromStack(stack);

  template.hasResourceProperties('AWS::SQS::Queue', {
    VisibilityTimeout: 300
  });
  template.resourceCountIs('AWS::SNS::Topic', 1);
});*/

