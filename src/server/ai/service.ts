import OpenAI from 'openai';
import type { ServerResponse } from '../../shared/ServerResponse';
const openai = new OpenAI({
    apiKey: process.env.OPENAI_KEY,
    dangerouslyAllowBrowser: true
});

const sleep = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));

export type AiService = (
    systemPrompt: string,
    userPrompt: string,
    config: Record<string, any>
) => Promise<ServerResponse>;

export const chatGPT: AiService = async (systemPrompt, userPrompt, config) => {
    console.log(`GPT:\n\tsys=${systemPrompt}\n\tuser=${userPrompt}`);
    if (userPrompt === 'test') {
        // TESTING CODE
        await sleep(1000);
        return { responseCode: 200, body: { message: 'I just slept for a bit!' } };
    }

    const cleanPrompt = `Never use swear words or foul language. Always be respectful. The response should be in the users locale which is ${config.locale}`;
    const exclusionsPrompt = `Do not include img links in responses, but you can use emojis.`;

    const completion = await openai.chat.completions.create({
        // TODO - gpt-4o here?
        model: 'gpt-4o-mini',
        messages: [
            { role: 'system', content: cleanPrompt },
            { role: 'system', content: exclusionsPrompt },
            { role: 'system', content: systemPrompt },
            { role: 'user', content: `Text: ${userPrompt}` }
        ]
    });

    console.log(`RESP: ${JSON.stringify(completion)}`);
    console.log(completion.choices[0].message);

    return {
        responseCode: 200,
        body: { message: completion.choices[0].message.content || '' }
    };
};
