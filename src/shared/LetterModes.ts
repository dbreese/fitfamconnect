import { translate } from '../i18n/i18n';

export enum LetterModeCodes {
    Kid = 'kid',
    Parent = 'parent'
}

export interface LetterMode {
    name: string;
    code: LetterModeCodes;
    description: string;
}

const KidMode: LetterMode = {
    name: translate('letterModes.kidMode'),
    code: LetterModeCodes.Kid,
    description: translate('letterModes.kidModeDescription')
};

const ParentMode: LetterMode = {
    name: translate('letterModes.parentMode'),
    code: LetterModeCodes.Parent,
    description: translate('letterModes.parentModeDescription')
};

export const LetterModes: LetterMode[] = [KidMode, ParentMode];

export function letterModeForCode(code: LetterModeCodes): LetterMode {
    return LetterModes.find((v) => v.code == code) || KidMode;
}
