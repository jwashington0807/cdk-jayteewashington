import { SendEmailCommand, SESv2Client } from '@aws-sdk/client-sesv2';
import { EmailTemplate } from '../ses/email-template';
import { UserEmail } from '../../models/ses';
import { Handler, Context } from 'aws-lambda';

// Set the AWS Region.
const REGION = "us-east-1";

const ses = new SESv2Client({ region: REGION });

export const handler: Handler = async (event, context: Context) => {

    // Get Environment Variables
    const emailTo = process.env.URLTO as string;
    const originURL = process.env.ORIGIN as string;

    try {
        // Parse JSON Body
        const body = JSON.parse(event.body) as UserEmail;

        // Construct Email Specs
        const command = new SendEmailCommand({
            Destination: {
                ToAddresses: [emailTo],
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
                                    name: body.name,
                                    comments: body.comments,
                                    email: body.email
                                }
                            )
                        }
                    }
                }
            }
        });

        // Attempt to send via SES
        let response = await ses.send(command);

        // If successful, send response
        return {
            statusCode: 200, 
            headers: {
                "Access-Control-Allow-Origin" : originURL, // Required for CORS support to work
                "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
                "Access-Control-Allow-Headers": "Content-Type, Authorization",
            },
            body: JSON.stringify({ message: 'Email Sent Successfully' })
        };
    }
    catch (error) {
        
        return {
            statusCode: 500,
            headers: {
                "Access-Control-Allow-Origin" : originURL, // Required for CORS support to work
                "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
                "Access-Control-Allow-Headers": "Content-Type, Authorization",
            },
            body: JSON.stringify(error)
        };
    }
}