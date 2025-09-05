import { type Response } from 'express';
import type { AiService } from './service';
import { Temperatures } from '../../shared/TemperatureModes';
import { createRecent } from '../services/resultService';
import type { AuthenticatedRequest } from '../auth/auth';
import { ToolEnum } from '../db/result';
import { updateUserPrefs } from '../user/userService';

export const rubric = async (aiService: AiService, req: AuthenticatedRequest, res: Response) => {
    console.log(`rubric=${JSON.stringify(req.body)}`);

    const userText = req.body.text;
    const params = req.body.params as Record<string, any>;
    const config = req.body.config;

    const level = params.level;
    const temperature = params.temperature;
    const title = params.title;
    const overview = params.overview;
    const pointScale = params.numberOfQuestions;

    var systemPrompt = `You will be provided with some text that contains criteria for a rubric.
        Your task is to create a rubric for a ${level} grade reading level with details on the criteria.
        Create a title with an introduction underneath it that briefly explains what the rubric is for.
        Create a summary at the bottom that gives encouragement to do a good job.
        Provide results formatted in an HTML table with each colum giving details for the point scale for each criteria. Use HTML table TH tags for the header. Do not add HTML styling.
        Do no use markdown formatting.
        The rubric should have a ${pointScale} point scale.
        The title of the assignment is ${title}.
        The purpose of the assignment is ${overview}.
    `;

    if (temperature === Temperatures.Lighthearted) {
        systemPrompt += 'It should be lighthearted and fun. Use emojis wherever possible!';
    } else if (temperature === Temperatures.Neutral) {
        systemPrompt += 'It should be neutral and to the point. Use emojis sparingly where it can add emphasis.';
    } else if (temperature === Temperatures.Urgent) {
        systemPrompt +=
            'It is an important letter stressing urgency. There may be a hint of stress in it. Only use emojis if needed to stress a point.';
    }

    const aiResponse = await aiService(systemPrompt, userText, config);

    // save recent
    if (aiResponse.responseCode == 200) {
        const user = req.user;
        createRecent(ToolEnum.Rubric, user, userText, params, config, aiResponse.body.message);
        updateUserPrefs(user, params);
    }

    res.json(aiResponse);
};
