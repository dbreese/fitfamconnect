import { type Response } from 'express';
import type { AiService } from './service';
import { Temperatures } from '../../shared/TemperatureModes';
import { createRecent } from '../services/resultService';
import type { AuthenticatedRequest } from '../auth/auth';
import { ToolEnum } from '../db/result';
import type { NewsletterSection } from '@/shared/Newsletter';
import { updateUserPrefs } from '../user/userService';

export const newsletter = async (aiService: AiService, req: AuthenticatedRequest, res: Response) => {
    console.log(`newsletter=${JSON.stringify(req.body)}`);
    // user text is empty for newsletters as each section is in the params.sections list
    const params = req.body.params as Record<string, any>;
    const config = req.body.config;

    var userText = '';
    var summary = '';
    const sections = params.sections as NewsletterSection[];
    sections.forEach((section) => {
        if (section.enabled) {
            if (summary === '') {
                // track a simple summary for recents. just use the first section.
                summary = `${section.title}: ${section.text}`;
            }
            userText += `\n___SECTIONTITLE___: ${section.title}`;
            userText += `\n___SECTIONTEXT___: ${section.text}\n\n`;
        }
    });
    userText = userText.trim();

    const temperature = params.temperature;

    var systemPrompt = `You will be provided with some text that is in sections which are denoted by ___SECTIONTEXT___.
        Each section has a title denoted by ___SECTIONTITLE___.
        Your task is to create a classroom newsletter for a teacher.
        Do not answer questions.
        Provide results formatted with HTML without markdown formatting.
        Be creative and embelish a little.
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
        createRecent(ToolEnum.Newsletter, user, summary, params, config, aiResponse.body.message);
        updateUserPrefs(user, params);
    }

    res.json(aiResponse);
};
