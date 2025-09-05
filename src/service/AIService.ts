import type { ServerResponse } from '@/shared/ServerResponse';
import { usersLocale } from '@/i18n/i18n';
import { type RecentItem, RecentTool } from '@/shared/Recents';
import type { NewsletterSection } from '@/shared/Newsletter';
import { submit } from './NetworkUtil';

export const AIService = {
    async levelText(text: string, level: string): Promise<ServerResponse | undefined> {
        return submitRequest('leveler', text, { level: level });
    },

    async grammarCheck(text: string, level: string, mode: string): Promise<ServerResponse | undefined> {
        return submitRequest('grammarcheck', text, { level: level, mode: mode });
    },

    async letterWriter(
        text: string,
        level: string | undefined,
        mode: string,
        subject: string,
        from: string,
        to: string,
        temperature: string
    ): Promise<ServerResponse | undefined> {
        return submitRequest('letterwriter', text, { level, mode, subject, from, to, temperature });
    },

    async newsLetter(sections: NewsletterSection[], temperature: string): Promise<ServerResponse | undefined> {
        return submitRequest('newsletter', '', { sections, temperature });
    },

    async quiz(
        text: string,
        quizType: string,
        level: string,
        temperature: string,
        numberOfQuestions: number
    ): Promise<ServerResponse | undefined> {
        return submitRequest('quiz', text, { quizType, level, temperature, numberOfQuestions });
    },

    async rubric(
        text: string,
        temperature: string,
        level: string,
        title: string,
        overview: string,
        pointScale: number
    ) {
        return submitRequest('rubric', text, { temperature, level, title, overview, pointScale });
    },

    async recents(tool: RecentTool, type: string): Promise<RecentItem[] | undefined> {
        return submit('GET', `/recents/list?tool=${tool}&type=${type}`)
            .then(async (result) => {
                if (result.ok) {
                    const results = await result.json();
                    console.log(`recents res: ${JSON.stringify(results)}`);
                    return results.map((item: any) => {
                        const date = new Date(item.createdAt);
                        const formattedDate = new Intl.DateTimeFormat(navigator.language, {
                            dateStyle: 'short',
                            timeStyle: 'short'
                        }).format(date);
                        return {
                            id: item.id,
                            description: `${formattedDate} : ${item.query.substring(0, 100)}${item.query.length >= 100 ? '...' : ''}`
                        };
                    });
                } else {
                    return undefined;
                }
            })
            .catch((error) => {
                console.error('error occurred getting recents:', error);
                return Promise.reject('Error.');
            });
    },

    async recentItem(id: string): Promise<RecentItem | undefined> {
        return submit('GET', `/recents/item?id=${id}`)
            .then(async (result) => {
                if (result.ok) {
                    const results = await result.json();
                    console.log(`item res: ${JSON.stringify(results)}`);
                    return results as RecentItem;
                } else {
                    return undefined;
                }
            })
            .catch((error) => {
                console.error('error occurred getting recent item:', error);
                return Promise.reject('Error.');
            });
    }
};

async function submitRequest(
    resource: string,
    text: string,
    params: any | undefined
): Promise<ServerResponse | undefined> {
    const body = {
        text: text,
        params: { ...(params ?? {}) },
        config: { locale: usersLocale }
    };

    return await submit('POST', `/api/ai/${resource}`, body)
        .then(async (result) => {
            console.log(`AI Res: ${JSON.stringify(result)}`);
            if (result.ok) {
                const json = await result.json();
                const response = json as ServerResponse;
                return response;
            } else {
                return undefined;
            }
        })
        .catch((error) => {
            console.error('error occurred:', error);
            return Promise.reject('Error.');
        });
}
