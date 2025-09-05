import { type Response } from 'express';
import { Temperatures } from '../../shared/TemperatureModes';
import { LetterModeCodes } from '../../shared/LetterModes';
import type { AiService } from './service';
import { createRecent } from '../services/resultService';
import type { AuthenticatedRequest } from '../auth/auth';
import { ToolEnum } from '../db/result';
import { updateUserPrefs } from '../user/userService';

export const letterWriter = async (aiService: AiService, req: AuthenticatedRequest, res: Response) => {
    console.log(`letter=${JSON.stringify(req.body)}`);

    const userText = req.body.text;
    const params = req.body.params;

    const config = req.body.config;

    const level = params.level;
    const mode = params.mode;
    const from = params.from;
    const temperature = params.temperature;

    var to = params.to;
    if (mode === LetterModeCodes.Parent) {
        to = `the parents of ${to}`;
    }

    var systemPrompt = `You will be provided with text. Your task is to write a letter. Keep it short. The letter is from ${from} and is to ${to}. Do not include a header or footer.`;

    if (temperature === Temperatures.Lighthearted) {
        systemPrompt += 'It should be lighthearted and fun. Use emojis wherever possible!';
    } else if (temperature === Temperatures.Neutral) {
        systemPrompt += 'It should be neutral and to the point. Use emojis sparingly where it can add emphasis.';
    } else if (temperature === Temperatures.Urgent) {
        systemPrompt +=
            'It is an important letter stressing urgency. There may be a hint of stress in it. Only use emojis if needed to stress a point.';
    }

    if (level) {
        systemPrompt += `Write it at a ${level} grade level.`;
    } else {
        systemPrompt += `This will be for parents or faculty, so write it for the average adult.`;
    }

    systemPrompt += 'Provide results formatted with HTML without markdown formatting.';

    const aiResponse = await aiService(systemPrompt, userText, config);

    // save recent
    if (aiResponse.responseCode == 200) {
        const user = req.user;
        createRecent(ToolEnum.LetterWriter, user, userText as string, params, config, aiResponse.body.message);
        updateUserPrefs(user, params);
    }

    res.json(aiResponse);
};
