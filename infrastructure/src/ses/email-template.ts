import { IConfirmationEvent, UserEmail } from "../../models/ses";

export const ConfirmationEmail = (input: IConfirmationEvent) => {
    const EmailType = (email: UserEmail) => {
    return `
    <!DOCTYPE html>
    <html lang="en">
        <head>
            <meta charset="UTF-8" />
            <meta http-equiv="Content-Type" content="text/html"; charset="utf-8" />
            <meta http-equiv="X-UA-Compatible" content="IE=edge" />
            <meta name="viewport" content="width=device-width, initial-scale=1.0" />
            <title> Test Email </title>
        </head>
        <body>
        Hello Test <br>
        Name: ${email.name} <br>
        Name: ${email.email} <br>
        Name: ${email.comments} <br>
        </body>
    </html>`;
    }
}