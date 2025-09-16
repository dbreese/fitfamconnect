import type { NewsletterSection } from '@/shared/Newsletter';
import type { IUser } from '../db/user';
import { clerkClient, getAuth } from '@clerk/express';
import express, { Router, type NextFunction, type Request, type Response } from 'express';
import { authenticateUser, authorizeRoles } from '../auth/auth';
import type { AuthenticatedRequest } from '../auth/auth';

export const router = Router();
router.use(express.json());

router.post(
    '/user/preferences',
    authenticateUser,
    authorizeRoles('user', 'owner', 'root'),
    async (req: AuthenticatedRequest, res: Response) => {
        // save prefs
        console.log(`userprefs=${JSON.stringify(req.body)}`);
        const params = req.body;
        const user = req.user;
        const status = await updateUserPrefs(user, params);
        res.json(status);
    }
);

/**
 * Update user preferences.
 *
 * @returns promise indicating whether or not preferences were updated.
 */
export async function updateUserPrefs(user: IUser | undefined, params: Record<string, any>): Promise<boolean> {
    if (!user) {
        console.log('No user, couldnt update prefs');
        return Promise.resolve(false);
    }

    // update user info
    const newPrefs = filterPreferences(params);
    const hasAllParamsAlready = hasAllPreferences(user.preferences, params);
    if (!hasAllParamsAlready) {
        // need to update the user object and somehow signal to the client that it has been updated
        console.log('UPDATING USER');
        for (const [key, value] of Object.entries(newPrefs)) {
            user.preferences.set(key, value);
        }
        console.log('UPDATED TO ' + JSON.stringify(user.preferences));
        await user.save();
        return Promise.resolve(true);
    } else {
        console.log('NOT UPDATING USER');
        return Promise.resolve(false);
    }
}

function filterPreferences(prefsNew: Record<string, any>): Record<string, any> {
    const allowedKeys = new Set(['mode', 'level', 'from', 'temperature', 'help']);
    const newPrefs = Object.fromEntries(Object.entries(prefsNew).filter(([key]) => allowedKeys.has(key)));

    // check for newsletter section titles
    const sections = prefsNew.newsletterSections as NewsletterSection[];
    if (sections != undefined) {
        newPrefs.newsletterSections = sections.map((section) => ({ title: section.title, enabled: section.enabled }));
    }

    return newPrefs;
}

function hasAllPreferences(prefsOrig: Record<string, any> | Map<string, any>, prefsNew: Record<string, any>): boolean {
    const prefsOrigObj = prefsOrig instanceof Map ? Object.fromEntries(prefsOrig) : prefsOrig;

    for (const [key, value] of Object.entries(prefsNew)) {
        if (!(key in prefsOrigObj) || prefsOrigObj[key] !== value) {
            return false;
        }
    }
    return true;
}
