export interface RecentItem {
    id: string;
    description: string;
    params: Record<string, any>;
    query: string;
    results: string;
}

export enum RecentTool {
    Leveler = 'leveler',
    Grammar = 'grammar',
    LetterWriter = 'letter',
    NewsLetter = 'newsletter',
    Quiz = 'quiz',
    Rubric = 'rubric'
}
