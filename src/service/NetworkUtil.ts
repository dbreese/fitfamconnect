import { SessionUtils } from './SessionUtils';

// Makes a back end request, adding needed security.
export async function submit(
    method: string,
    path: string,
    body: Record<string, any> | undefined = undefined
): Promise<Response> {
    const token = await SessionUtils.getToken();

    console.log(`Submitting ${method}:${__API_SERVER__}${path} : ${JSON.stringify(body)}`);

    // For GET and HEAD requests, don't include body or Content-Type
    const isGetOrHead = method.toUpperCase() === 'GET' || method.toUpperCase() === 'HEAD';

    const fetchOptions: RequestInit = {
        method: method,
        headers: {
            Authorization: `Bearer ${token}`
        }
    };

    // Only add Content-Type and body for non-GET/HEAD requests
    if (!isGetOrHead && body !== undefined) {
        fetchOptions.headers = {
            ...fetchOptions.headers,
            'Content-Type': 'application/json'
        };
        fetchOptions.body = JSON.stringify(body);
    }

    return fetch(`${__API_SERVER__}${path}`, fetchOptions)
        .then(async (response) => {
            return response;
        })
        .catch((error) => {
            console.error('Error occurred:', error);
            return Promise.reject('Error.');
        });
}
