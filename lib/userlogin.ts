import { Code, Function, IFunction, Runtime } from "aws-cdk-lib/aws-lambda";
import { Construct } from "constructs";

export interface UserLoginProps {
  /** the function for which we want to count url hits **/
  downstream: IFunction;
}

export class UserLogin extends Construct {
  constructor(scope: Construct, id: string, props: UserLoginProps) {
    super(scope, id);

    // defines an AWS Lambda Resource
    const userlogin = new Function(this, "UserLoginHandler", {
      runtime: Runtime.NODEJS_20_X,
      code: Code.fromAsset("lambda"), 
      handler: "userlogin.handler",
    });

  }
}