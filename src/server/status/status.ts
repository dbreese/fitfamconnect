import { clerkClient, getAuth } from '@clerk/express';
import express, { Router, type NextFunction, type Request, type Response } from 'express';

export const status = Router();
status.use(express.json());

status.get('/api/status', async (req, res) => {
    const auth = getAuth(req);
    console.log('STATUS AUTH: ' + JSON.stringify(auth));

    const userId = auth.userId;

    let status: Record<string, any> = {
        status: 'OK'
    };

    if (userId) {
        const user = await clerkClient.users.getUser(userId);
        status = { ...status, userId: userId, username: user.username };
    }

    console.log(`STATUS RETURN: ` + JSON.stringify(status));
    res.json(status);
});
