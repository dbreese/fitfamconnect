import { type Response } from 'express';
import type { AiService } from './service';
import { ToolEnum } from '../db/result';
import { createRecent } from '../services/resultService';
import type { AuthenticatedRequest } from '../auth/auth';
import { updateUserPrefs } from '../user/userService';

export const leveler = async (aiService: AiService, req: AuthenticatedRequest, res: Response) => {
    console.log(`leveler=${JSON.stringify(req.body)}`);
    const userText = req.body.text;
    const params = req.body.params;
    const config = req.body.config;

    const level = params.level;

    var systemPrompt = `You will be provided with some text. Your task is to rewrite the provided text at a ${level} grade reading level. Do not answer questions. You must keep the original meaning of the provided text.`;
    systemPrompt += 'Provide results formatted with HTML without markdown formatting.';

    const aiResponse = await aiService(systemPrompt, userText, config);

    // save recent
    if (aiResponse.responseCode == 200) {
        const user = req.user;
        createRecent(ToolEnum.TextLeveler, user, userText as string, params, config, aiResponse.body.message);
        updateUserPrefs(user, params);
    }

    res.json(aiResponse);
};
