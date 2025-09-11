import express, { Router, type NextFunction, type Request, type Response } from 'express';
import Result, { ResultEnum, ToolEnum, type ResultType, type ToolType } from '../db/result';
import type { AuthenticatedRequest } from '../auth/auth';
import { authenticateUser, authorizeRoles } from '../auth/auth';

export const recents = Router();
recents.use(express.json());

recents.get('/recents/list', authenticateUser, authorizeRoles('owner'), async (req: AuthenticatedRequest, res) => {
    const userId = req.user?._id;

    const { tool, type } = req.query;

    // if (!tool || !Object.values<ToolType>(ToolEnum).includes(tool as ToolType)) {
    //     return res.status(400).json({ error: 'Invalid tool parameter' });
    // }

    // if (!type || !Object.values<ResultType>(ResultEnum).includes(type as ResultType)) {
    //     return res.status(400).json({ error: 'Invalid type parameter' });
    // }

    console.log(`Recent search: userid=${userId}, tool=${tool}, type=${type}`);

    const results = await Result.find({
        userId: userId,
        tool: tool,
        type: type
    }).sort({ createdAt: -1 }); // Sorts by newest first

    console.log(`RECENT RESULTS: ${results}`);

    res.json(results);
});

recents.get('/recents/item', authenticateUser, authorizeRoles('owner'), async (req: AuthenticatedRequest, res) => {
    const userId = req.user?._id;

    const { id } = req.query;

    console.log(`Recent search: userid=${userId}, id=${id}`);

    const results = await Result.findOne({
        userId: userId,
        id: id
    });

    console.log(`RECENT ITEM RESULTS: ${results}`);

    res.json(results);
});
