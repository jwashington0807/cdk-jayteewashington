import { SendEmailCommand, SendEmailCommandInput, SESv2Client } from '@aws-sdk/client-sesv2';
import { EmailTemplate } from '../ses/email-template';
import { IEmailEvent } from '../../models/ses';

let client: SESv2Client;

export const handler = async (event: IEmailEvent) => {
    if(!client) {
        client = new SESv2Client({});

        const date = new Date();
        const formattedDate = date.toLocaleDateString('en-EN', { day: 'numeric', month: 'short'});

        const input: SendEmailCommandInput = {
            FromEmailAddress: 'JT <noreply@jayteewashington.com>',
            Destination: { ToAddresses: [event.reciever] },
            EmailTags: [{ Name: 'type', Value: 'sent-confirmation' }],
            ReplyToAddresses: ['noreply@jayteewashington.com'],
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
                        },
                        Text: { Data: 'Test Email' }
                    }
                }
            }
        }

        const command = new SendEmailCommand(input);
        await client.send(command);

    }

    return {statusCode: 200, body: "OK"};
}