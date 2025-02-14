import { logInfo } from '../utils/logger';
//import { processData } from '../services/data-service';

exports.handler = async function(event: any) {
    try
    {
        logInfo('Processing Data...');
        
        const inputData = JSON.parse(event.body || '{}' );
        //const result = await processData(inputData);

        return {
            statusCode: 200,
            body: JSON.stringify({ message: 'Data Processed Successfully' })
        };
    }
    catch(e)
    {
        return {
            statusCode: 403,
            body: JSON.stringify({ message: 'Error Occurred', e})
        };
    }
};