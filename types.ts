// Fix: Replaced the incorrect component code with the correct type definitions for the application.
export enum GameState {
    Start,
    Quiz,
    Results,
}

export interface Choice {
    id: string;
    text: string;
    icon: string;
    imageUrl?: string;
}

export interface Question {
    id: string;
    text: string;
    choices: Choice[];
}

export interface Job {
    id: string;
    name: string;
    clusterCode: string;
    clusterName: string;
    emoji: string;
}

export interface OptionJobMapItem {
    option_id: string;
    job_id: string;
}

export interface QuizData {
    questions: Question[];
    jobs: Job[];
    optionJobMap: OptionJobMapItem[];
}

export interface ScoreEntry {
    job_id: string;
    job_name: string;
    score: number;
}

export interface ScoringResults {
    counts: Record<string, number>;
    topJobs: { job_id: string; job_name: string; }[];
    sortedScores: ScoreEntry[];
}