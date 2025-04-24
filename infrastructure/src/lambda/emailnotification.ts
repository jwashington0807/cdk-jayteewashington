import { SendEmailCommand, SESv2Client } from '@aws-sdk/client-sesv2';
import { EmailTemplate } from '../ses/email-template';
import { IEmailEvent } from '../../models/ses';

const ses = new SESv2Client({ region: "us-east-1" });

export const handler = async (event: IEmailEvent) => {

    //const date = new Date();
    //const formattedDate = date.toLocaleDateString('en-EN', { day: 'numeric', month: 'short'});

    const command = new SendEmailCommand({
        Destination: {
            ToAddresses: [event.reciever],
        },
        FromEmailAddress: 'JT <noreply@jayteewashington.com>',
        EmailTags: [{ Name: 'type', Value: 'sent-confirmation' }],
        ReplyToAddresses: [ 'noreply@jayteewashington.com' ],
        Content: {
            Simple: {
                Subject: { Data: 'You have a new contact submission'},
                Body: {
                    Html: {
                        Charset: 'UTF-8',
                        Data: EmailTemplate(
                            {
                                id: event.id,
                                name: event.name,
                                comments: event.comments,
                                email: event.email,
                                reciever: 'jaytee.washington@gmail.com'
                            }
                        )
                    }
                }
            }
        }
    });

    try {
        let response = await ses.send(command);

        return {
            statusCode: 200, 
            headers: {
                "Access-Control-Allow-Origin" : "*", // Required for CORS support to work
            },
            body: JSON.stringify(response)
        };
    }
    catch (error) {
        
        return {
            statusCode: 503,
            body: JSON.stringify(error)
        };
    }
    finally {
        // Finally 
    }
}