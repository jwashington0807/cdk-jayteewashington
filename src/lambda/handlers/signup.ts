exports.handler = async function(event: any) {
    try
    {
        return {
            ...event,
            response: {
                autoConfirmUser: true,
                autoVerifyEmail: true
            }
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