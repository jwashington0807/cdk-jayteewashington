import { CognitoIdentityProviderClient, SignUpCommand } from '@aws-sdk/client-cognito-identity-provider';

const CLIENTID = process.env.CLIENTID;
const client = new CognitoIdentityProviderClient();

const input = {

    // SignUp Request
    ClientId: CLIENTID,
    Username: "username",
    Password: "password",
    UserAttributes: [
        {
            Name: "email",
            Value: "user@domain.com"
        },
    ],
};

const command = new SignUpCommand(input);

test("User can sign up", async () => {
    const response = await client.send(command);
    expect(response.UserConfirmed).toBe(true);
})
