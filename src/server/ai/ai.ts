// import { requireAuth } from '@clerk/express';
import express, { Router, type NextFunction, type Request, type Response } from 'express';

import { chatGPT } from './service';
import { authenticateUser, authorizeRoles } from '../auth/auth';

import { leveler } from './leveler';
import { grammarChecker } from './grammarchecker';
import { letterWriter } from './letterwriter';
import { newsletter } from './newsletter';
import { quiz } from './quiz';
import { rubric } from './rubric';

export const router = Router();
router.use(express.json());

router.post('/api/ai/leveler', authenticateUser, authorizeRoles('user'), async (req, res) =>
    leveler(chatGPT, req, res)
);
router.post('/api/ai/grammarcheck', authenticateUser, authorizeRoles('user'), async (req, res) =>
    grammarChecker(chatGPT, req, res)
);
router.post('/api/ai/letterwriter', authenticateUser, authorizeRoles('user'), async (req, res) =>
    letterWriter(chatGPT, req, res)
);
router.post('/api/ai/newsletter', authenticateUser, authorizeRoles('user'), async (req, res) =>
    newsletter(chatGPT, req, res)
);
router.post('/api/ai/quiz', authenticateUser, authorizeRoles('user'), async (req, res) => quiz(chatGPT, req, res));

router.post('/api/ai/rubric', authenticateUser, authorizeRoles('user'), async (req, res) => rubric(chatGPT, req, res));
