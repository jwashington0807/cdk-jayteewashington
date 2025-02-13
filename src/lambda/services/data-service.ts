import { v4 as uuidv4 } from 'uuid';

export async function processData(data: any): Promise<any> {
    return new Promise((resolve) => {
        setTimeout(() => {
            resolve({ processedData: data, timestamp: new Date().toISOString(), uuid: uuidv4()});
        }, 1000);
    })
}