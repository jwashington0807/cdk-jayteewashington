import { UserEmail } from "../../models/ses";

export const EmailTemplate = (email: UserEmail) => {
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
        Email: ${email.email} <br>
        Comments: ${email.comments} <br>
        </body>
    </html>`;
}