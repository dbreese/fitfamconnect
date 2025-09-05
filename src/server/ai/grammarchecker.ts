import { GrammarModeCodes } from '../../shared/GrammarModes';
import type { ServerResponse } from '../../shared/ServerResponse';
import { type Response } from 'express';
import type { AiService } from './service';
import { createRecent } from '../services/resultService';
import type { AuthenticatedRequest } from '../auth/auth';
import { ToolEnum } from '../db/result';
import { updateUserPrefs } from '../user/userService';

export const grammarChecker = async (aiService: AiService, req: AuthenticatedRequest, res: Response) => {
    console.log(`grammar=${JSON.stringify(req.body)}`);

    const userText = req.body.text;
    const params = req.body.params;
    const config = req.body.config;

    const level = params.level;
    const mode = params.mode;

    var systemPrompt = 'You will be provided with text. You are to ';
    if (mode === GrammarModeCodes.Grade) {
        systemPrompt += `
            provide a clear explanation of the mistakes that are found. Do not rewrite the text. Include original text in response.
            Provide the explanations at a ${level} grade level.
        `;
    } else {
        systemPrompt += `convert it to standard language at a ${level} grade level.`;
    }
    systemPrompt += 'Provide results formatted with HTML without markdown formatting.';

    const aiResponse = await aiService(systemPrompt, userText, config);

    // save recent
    if (aiResponse.responseCode == 200) {
        const user = req.user;
        createRecent(ToolEnum.Grammar, user, userText as string, params, config, aiResponse.body.message);
        updateUserPrefs(user, params);
    }

    res.json(aiResponse);
};
