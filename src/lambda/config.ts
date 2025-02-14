import { LambdaDefinition } from "../../types";

export const getLambdaDefinitions = (): LambdaDefinition[] => {
    const lambdaDefinitions: LambdaDefinition[] = [
        {
            name: 'signin',
            entry: 'src/lambda/handlers/signin.ts',
            resource: 'Account',
            method: 'GET',
            isPrivate: false
        },
        {
            name: 'signup',
            entry: 'src/lambda/handlers/signup.ts',
            resource: 'Account',
            method: 'POST',
            isPrivate: false
        },
        {
            name: 'signout',
            entry: 'src/lambda/handlers/signout.ts',
            resource: 'Account',
            method: 'POST',
            isPrivate: false
        },
    ];

    return lambdaDefinitions;
}