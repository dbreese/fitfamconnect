import { translate } from '../i18n/i18n';

export enum QuizTypeCode {
    MultipleChoice = 'Multi',
    FillInBlank = 'FillIn',
    Essay = 'Essay'
}

export interface QuizType {
    name: string;
    code: QuizTypeCode;
    description: string;
}

export const QuizTypes: QuizType[] = [
    {
        name: translate('quizTypes.multi'),
        code: QuizTypeCode.MultipleChoice,
        description: translate('quizTypes.multiDesc')
    },
    {
        name: translate('quizTypes.fillin'),
        code: QuizTypeCode.FillInBlank,
        description: translate('quizTypes.fillinDesc')
    },
    { name: translate('quizTypes.essay'), code: QuizTypeCode.Essay, description: translate('quizTypes.essayDesc') }
];

export function quizTypeForCode(code: QuizTypeCode): QuizType {
    return QuizTypes.find((g) => g.code == code) || QuizTypes[0];
}
