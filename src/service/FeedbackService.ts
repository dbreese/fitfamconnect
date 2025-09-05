import type { ServerResponse } from '@/shared/ServerResponse';
import { submit } from './NetworkUtil';

export const FeedbackService = {
    async send(text: string): Promise<ServerResponse | undefined> {
        return submitRequest(text);
    }
};

async function submitRequest(text: string): Promise<ServerResponse | undefined> {
    const body = {
        feedback: text
    };

    return await submit('POST', `/feedback`, body)
        .then(async (result) => {
            console.log(`Res: ${JSON.stringify(result)}`);
            if (result.ok) {
                const json = await result.json();
                const response = json as ServerResponse;
                return response;
            } else {
                return undefined;
            }
        })
        .catch((error) => {
            console.error('error occurred sending feedback:', error);
            return Promise.reject('Error.');
        });
}
