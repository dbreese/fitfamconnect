// prettier-ignore
import './env'; // Ensure dotenv loads before other imports

import { clerkMiddleware } from '@clerk/express';

import compression from 'compression';
import express from 'express';
import helmet from 'helmet';
import path from 'path';
import { router as aiRouter } from './ai/ai';
import { router as authRouter } from './auth/auth';
import { router as userRouter } from './user/userService';
import { router as feedbackRouter } from './feedback/feedbackService';
import { router as gymRouter } from './gym/gymService';
import { status } from './status/status';
import { recents } from './recents/recents';
import type { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import morgan from 'morgan';
import listEndpoints from 'express-list-endpoints';
import connectDB from './db/database';
import { connect } from 'http2';

const clerkKey = process.env.CLERK_PUBLISHABLE_KEY;
if (!clerkKey) {
    throw new Error('Publishable key is missing.');
}

const app = express();
app.use(morgan('combined')); // Logs requests in Apache-style format
app.use(clerkMiddleware({ debug: true, enableHandshake: true }));

// CORS CONFIG
// ✅ Allowed origins list
const allowedOrigins = [
    'http://localhost:5173',
    'https://schoolai-frontend.onrender.com',
    'https://www.fitfamconnect.com',
    'https://fitfamconnect.com'
];
app.use(
    cors({
        origin: (origin, callback) => {
            console.log('Checking origin: ' + JSON.stringify(origin));
            if (!origin || allowedOrigins.includes(origin)) {
                callback(null, origin); // ✅ Allow the request origin
            } else {
                callback(new Error('DUSTIN Not allowed by CORS'));
            }
        },
        credentials: true, // ✅ Required for cookies/auth headers
        methods: 'GET,POST,PUT,DELETE,OPTIONS',
        allowedHeaders: 'Content-Type,Authorization'
    })
);

app.use(helmet());
app.use(compression());
app.use(authRouter);
app.use(aiRouter);
app.use(userRouter);
app.use(feedbackRouter);
app.use(gymRouter);
app.use(status);
app.use(recents);

app.use(express.static(path.join(__dirname, '../')));

// unknown routes from client should get home page -- causes regex errror
// app.get('/*', (_, res) => {
//     res.sendFile(path.join(__dirname, '../', 'index.html'));
// });

connectDB();

app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
    console.error('EXPRESS ISSUE OCCURRED!', err);
    console.error(`EXPRESS ISSUE OCCURRED! ${err.stack}`);
    res.status(401).send('Unauthenticated!');
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('Dustin Unhandled Promise Rejection:', reason);
});

process.on('uncaughtException', (error) => {
    console.error('Dustin Uncaught Exception:', error);
});

console.log('ROUTER ENDPOINTS DEFINED: ');
console.log(listEndpoints(app));
console.log(listEndpoints(authRouter));
console.log(listEndpoints(aiRouter));
console.log(listEndpoints(userRouter));
console.log(listEndpoints(feedbackRouter));
console.log(listEndpoints(gymRouter));
console.log(listEndpoints(recents));

const port = process.env['PORT'] || 3002;
app.listen(port, () => console.log(`Server started at ${port}`));
