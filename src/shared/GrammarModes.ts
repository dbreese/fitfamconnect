import { translate } from '../i18n/i18n';

export enum GrammarModeCodes {
    Correct = 'correct',
    Grade = 'grade'
}

export interface GrammarMode {
    name: string;
    code: GrammarModeCodes;
    description: string;
}

const CorrectMode = {
    name: translate('grammarModes.correctMode'),
    code: GrammarModeCodes.Correct,
    description: translate('grammarModes.correctDescription')
};

const GradeMode = {
    name: translate('grammarModes.gradeMode'),
    code: GrammarModeCodes.Grade,
    description: translate('grammarModes.gradeDescription')
};

export const GrammarModes: GrammarMode[] = [CorrectMode, GradeMode];

export function grammarModeForCode(code: GrammarModeCodes): GrammarMode {
    return GrammarModes.find((v) => v.code == code) || CorrectMode;
}
