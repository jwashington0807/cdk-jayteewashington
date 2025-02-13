import { logInfo } from '../utils/logger';
import { processData } from '../services/data-service';
import { APIGatewayProxyEvent, APIGatewayProxyHandler } from 'aws-lambda';

export const handler: APIGatewayProxyHandler = async (event: APIGatewayProxyEvent) => {
    logInfo('Processing Data...');
    
    const inputData = JSON.parse(event.body || '{}' );
    const result = await processData(inputData);

    return {
        statusCode: 200,
        body: JSON.stringify({ message: 'Data Processed Successfully', result})
    };
};