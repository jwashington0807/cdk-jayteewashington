import { v4 as uuidv4 } from 'uuid';
import { APIGatewayProxyHandler, APIGatewayProxyEvent } from 'aws-lambda';

export const handler: APIGatewayProxyHandler = async (event: APIGatewayProxyEvent) => {

    return {
        statusCode: 200,
        body: JSON.stringify({
            message: uuidv4()
        }),
    }
};