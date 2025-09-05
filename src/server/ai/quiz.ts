import { type Response } from 'express';
import type { AiService } from './service';
import { Temperatures } from '../../shared/TemperatureModes';
import { createRecent } from '../services/resultService';
import type { AuthenticatedRequest } from '../auth/auth';
import { ToolEnum } from '../db/result';
import { updateUserPrefs } from '../user/userService';
import { QuizTypeCode } from '../../shared/QuizTypes';

export const quiz = async (aiService: AiService, req: AuthenticatedRequest, res: Response) => {
    console.log(`quiz=${JSON.stringify(req.body)}`);
    const userText = req.body.text;
    const params = req.body.params as Record<string, any>;
    const config = req.body.config;

    const level = params.level;
    const temperature = params.temperature;
    const numberOfQuestions = params.numberOfQuestions;
    const quizType = params.quizType;

    var systemPrompt = `You will be provided with some text to generate a quiz for.
        Your task is to create a quiz for a teacher with ${numberOfQuestions} questions.
        Provide an answer key at the very bottom.
        Provide results formatted with HTML without markdown formatting.
        Create the quiz for a ${level} grade reading level.
    `;

    if (temperature === Temperatures.Lighthearted) {
        systemPrompt += 'It should be lighthearted and fun. Use emojis wherever possible!';
    } else if (temperature === Temperatures.Neutral) {
        systemPrompt += 'It should be neutral and to the point. Use emojis sparingly where it can add emphasis.';
    } else if (temperature === Temperatures.Urgent) {
        systemPrompt +=
            'It is an important letter stressing urgency. There may be a hint of stress in it. Only use emojis if needed to stress a point.';
    }

    if (quizType === QuizTypeCode.MultipleChoice) {
        systemPrompt += 'The quiz should be multiple choice.';
    } else if (quizType === QuizTypeCode.FillInBlank) {
        systemPrompt += 'The questions should each have a short fill-in-the-blank word or phrase.';
    } else if (quizType === QuizTypeCode.Essay) {
        systemPrompt += 'The questions will be answered via essay responses, including multiple sentences.';
    }

    const aiResponse = await aiService(systemPrompt, userText, config);

    // save recent
    if (aiResponse.responseCode == 200) {
        const user = req.user;
        createRecent(ToolEnum.Quiz, user, userText, params, config, aiResponse.body.message);
        updateUserPrefs(user, params);
    }

    res.json(aiResponse);
};
