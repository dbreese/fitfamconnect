import { filter } from 'compression';
import Result, { type ToolType, ResultEnum } from '../db/result';
import type { IUser } from '../db/user';

/**
 * Create a recent item for the given information.
 *
 * @param tool - the type of tool for the recent item.
 * @param user - the IUser instance.
 * @param query - the users query. This can be an empty string in the case of Newsletters which have
 * multiple input fields.
 * @param params - params from the query tool. these values will be updated on the user preferences.
 * @param config - query tool config (ie, locale).
 * @param results - the results from the ai service.
 * @returns
 */
export async function createRecent(
    tool: ToolType,
    user: IUser | undefined,
    query: string,
    params: Record<string, any>,
    config: Record<string, any>,
    results: string
) {
    if (!user) {
        console.log('No user, couldnt save recent or update prefs');
        return;
    }
    const newResult = new Result({
        userId: user._id,
        tool: tool,
        type: ResultEnum.Recent,
        query: query,
        params: params,
        config: config,
        results: results
    });

    // kick off an async save.
    newResult.save();
    console.log('Result saved:', newResult);
}
