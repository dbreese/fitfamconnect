import { SessionUtils } from './SessionUtils';

// Makes a back end request, adding needed security.
export async function submit(
    method: string,
    path: string,
    body: Record<string, any> | undefined = undefined
): Promise<Response> {
    const token = await SessionUtils.getToken();

    console.log(`Submitting ${method}:${__API_SERVER__}${path} : ${JSON.stringify(body)}`);

    return fetch(`${__API_SERVER__}${path}`, {
        method: method,
        headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`
        },
        body: body === undefined ? undefined : JSON.stringify(body)
    })
        .then(async (response) => {
            return response;
        })
        .catch((error) => {
            console.error('Error occurred:', error);
            return Promise.reject('Error.');
        });
}
