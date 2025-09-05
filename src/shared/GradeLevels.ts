import { translate } from '../i18n/i18n';

export enum Grades {
    Kindergarten = 'Kindergarten',
    First = '1st',
    Second = '2nd',
    Third = '3rd',
    Fourth = '4th',
    Fifth = '5th',
    Sixth = '6th',
    Seventh = '7th',
    Eight = '8th',
    Ninth = '9th',
    Tenth = '10th',
    Eleventh = '11th',
    Twelfth = '12th'
}

export interface GradeLevel {
    name: string;
    code: Grades;
}

export const GradeLevels: GradeLevel[] = [
    { name: translate('grades.kindergarten'), code: Grades.Kindergarten },
    { name: translate('grades.first'), code: Grades.First },
    { name: translate('grades.second'), code: Grades.Second },
    { name: translate('grades.third'), code: Grades.Third },
    { name: translate('grades.fourth'), code: Grades.Fourth },
    { name: translate('grades.fifth'), code: Grades.Fifth },
    { name: translate('grades.sixth'), code: Grades.Sixth },
    { name: translate('grades.seventh'), code: Grades.Seventh },
    { name: translate('grades.eight'), code: Grades.Eight },
    { name: translate('grades.ninth'), code: Grades.Ninth },
    { name: translate('grades.tenth'), code: Grades.Tenth },
    { name: translate('grades.eleventh'), code: Grades.Eleventh },
    { name: translate('grades.twelfth'), code: Grades.Twelfth }
];

export function gradeLevelForCode(code: Grades): GradeLevel {
    return GradeLevels.find((g) => g.code == code) || GradeLevels[0];
}
