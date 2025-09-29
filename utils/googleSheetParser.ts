import { QuizData, Question, Choice, Job, OptionJobMapItem } from '../types';

const SPREADSHEET_ID = '1E5eZFKRqsm2mR6WwldrkMP_-yyTqPfU5HOnRI9z7sl0';

// Helper to get a value from an object with a case-insensitive key
function getValueCaseInsensitive<T = any>(obj: Record<string, any>, key: string): T | undefined {
    if (!obj || typeof obj !== 'object') return undefined;
    const keyToFind = key.toLowerCase();
    const foundKey = Object.keys(obj).find(k => k.toLowerCase() === keyToFind);
    return foundKey ? obj[foundKey] as T : undefined;
}

// Helper to fetch and parse a sheet from the gviz endpoint
async function fetchSheetData(sheetName: string): Promise<any[]> {
    // Add a timestamp to prevent browser caching
    const timestamp = new Date().getTime();
    const url = `https://docs.google.com/spreadsheets/d/${SPREADSHEET_ID}/gviz/tq?tqx=out:json&sheet=${encodeURIComponent(sheetName)}&headers=1&t=${timestamp}`;
    
    try {
        const res = await fetch(url);
        // Do not throw on !res.ok because gviz can return error details in the body on a 4xx response
        const text = await res.text();
        
        // Gviz returns JSONP, so we need to extract the JSON object
        const jsonString = text.match(/google\.visualization\.Query\.setResponse\((.*)\);/s)?.[1];
        
        if (!jsonString) {
            if (text.includes("access_denied")) {
                 throw new Error(`Could not access Google Sheet "${sheetName}". Please make sure your spreadsheet is public by going to "File" > "Share" > "Publish to web" in Google Sheets.`);
            }
            if (text.toLowerCase().includes("invalid sheet name")) {
                throw new Error(`Could not find a sheet named "${sheetName}". Please check for typos or case-sensitivity (e.g., "Options" vs "options").`);
            }
            throw new Error(`Invalid response for sheet "${sheetName}". Please check if the sheet name is correct and the spreadsheet is published to the web.`);
        }
        
        const data = JSON.parse(jsonString);

        if (data.status === 'error') {
            const errorMessage = data.errors[0]?.detailed_message || `An error occurred while loading sheet "${sheetName}".`;
            if (errorMessage.toLowerCase().includes('invalid sheet name')) {
                 throw new Error(`Could not find a sheet named "${sheetName}". Please check for typos or case-sensitivity (e.g., "Options" vs "options").`);
            }
            throw new Error(errorMessage);
        }
        
        if (!data.table || !data.table.cols || data.table.cols.length === 0 || !data.table.rows) {
            // This handles cases where the sheet is found but is completely empty (no headers, no rows)
            return [];
        }
        
        // Trim headers to be robust against whitespace issues
        const headers = data.table.cols.map((col: any) => String(col.label || '').trim());
        const rows = (data.table.rows || []).map((row: any) => {
            const rowData: { [key: string]: any } = {};
            (row.c || []).forEach((cell: any, index: number) => {
                const header = headers[index];
                if (header) { 
                    rowData[header] = cell?.v ?? null;
                }
            });
            return rowData;
        });
        return rows.filter(r => Object.values(r).some(val => val !== null && val !== ''));
    } catch (error) {
        console.error(`Error fetching or parsing sheet "${sheetName}":`, error);
        if (error instanceof Error) throw error;
        throw new Error(`An unexpected error occurred while loading data for "${sheetName}".`);
    }
}

// Main function to fetch all data and structure it
export async function getQuizData(): Promise<QuizData> {
    const [rawQuestions, rawOptions, rawJobs, rawOptionJobMap] = await Promise.all([
        fetchSheetData('Questions'),
        fetchSheetData('Options'),
        fetchSheetData('Jobs'),
        fetchSheetData('OptionJobMap'),
    ]);

    const sheetIdError = (sheetName: string) => 
        `Failed to load any data from the '${sheetName}' sheet in the spreadsheet with ID: '${SPREADSHEET_ID}'. Please verify: 1. The sheet is named '${sheetName}' (case matters). 2. The sheet contains data. 3. The spreadsheet ID in your URL matches the ID in this message.`;

    if (rawQuestions.length === 0) {
        throw new Error(sheetIdError('Questions'));
    }
    if (rawOptions.length === 0) {
        throw new Error(sheetIdError('Options'));
    }

    const jobs: Job[] = rawJobs.map(j => ({
        id: String(getValueCaseInsensitive(j, 'job_id') || '').trim(),
        name: String(getValueCaseInsensitive(j, 'job_name') || ''),
        clusterCode: String(getValueCaseInsensitive(j, 'cluster_code') || ''),
        clusterName: String(getValueCaseInsensitive(j, 'cluster_name') || ''),
        emoji: String(getValueCaseInsensitive(j, 'emoji') || ''),
    })).filter(j => j.id);

    const optionJobMap: OptionJobMapItem[] = rawOptionJobMap.map(m => ({
        option_id: String(getValueCaseInsensitive(m, 'option_id') || '').trim(),
        job_id: String(getValueCaseInsensitive(m, 'job_id') || '').trim(),
    })).filter(m => m.option_id && m.job_id);

    const optionsByQuestion = rawOptions.reduce((acc, opt) => {
        const qId = String(getValueCaseInsensitive(opt, 'question_id') || '').trim();
        if (qId) {
            if (!acc[qId]) acc[qId] = [];
            const optionId = String(getValueCaseInsensitive(opt, 'option_id') || '').trim();
            if (optionId) {
                 // The text could be in an 'option_text' or a 'text' column. Prioritize 'option_text'.
                 const choiceText = getValueCaseInsensitive<string>(opt, 'option_text') ?? getValueCaseInsensitive<string>(opt, 'text') ?? '';
                 acc[qId].push({
                    id: optionId,
                    text: String(choiceText),
                    icon: String(getValueCaseInsensitive(opt, 'icon') || ''),
                    imageUrl: getValueCaseInsensitive<string>(opt, 'image_url'),
                });
            }
        }
        return acc;
    }, {} as Record<string, Choice[]>);

    const questionsWithChoicesAttempt = rawQuestions
      .sort((a,b) => Number(getValueCaseInsensitive(a, 'order')) - Number(getValueCaseInsensitive(b, 'order')))
      .map(q => {
          const qId = String(getValueCaseInsensitive(q, 'question_id') || '').trim();
          return {
            id: qId,
            text: String(getValueCaseInsensitive(q, 'text') || ''),
            choices: optionsByQuestion[qId] || [],
        };
      }).filter(q => q.id);

    if (questionsWithChoicesAttempt.length === 0) {
        throw new Error("Found rows in the 'Questions' sheet, but could not find any valid 'question_id' values. Please check the 'question_id' column.");
    }

    const finalQuestions = questionsWithChoicesAttempt.filter(q => q.choices.length > 0);

    if (finalQuestions.length === 0) {
        const questionSheetIDs = [...new Set(rawQuestions.map(q => String(getValueCaseInsensitive(q, 'question_id') || '').trim()))].filter(Boolean);
        const optionSheetIDs = [...new Set(rawOptions.map(o => String(getValueCaseInsensitive(o, 'question_id') || '').trim()))].filter(Boolean);

        if (questionSheetIDs.length > 0 && optionSheetIDs.length === 0) {
            const optionsHeaders = rawOptions.length > 0 ? Object.keys(rawOptions[0]) : [];
            const specificErrorMessage = `
                The app can't find the linking 'question_id' column in your 'Options' sheet.

                This almost always means the column header in the 'Options' sheet is not named 'question_id'.

                Here are the exact column headers the app found in your 'Options' sheet:
                [${optionsHeaders.join(', ')}]

                Please rename the correct column to 'question_id' (case does not matter).
            `;
            throw new Error(specificErrorMessage);
        }
        
        const diagnosticMessage = `
            Failed to link questions to answers. Here's a diagnostic report of what the app is seeing:

            Found these IDs in your 'Questions' sheet:
            [${questionSheetIDs.join(', ')}]

            Found these linking IDs in your 'Options' sheet:
            [${optionSheetIDs.join(', ')}]

            For the quiz to work, at least one ID from the 'Questions' list must exactly match an ID from the 'Options' list. Please compare them carefully for typos or other differences.
        `;
        throw new Error(diagnosticMessage);
    }

    return {
        questions: finalQuestions,
        jobs,
        optionJobMap,
    };
}

async function fetchSheetForDebug(sheetName: string): Promise<string> {
    const timestamp = new Date().getTime();
    const url = `https://docs.google.com/spreadsheets/d/${SPREADSHEET_ID}/gviz/tq?tqx=out:json&sheet=${encodeURIComponent(sheetName)}&headers=1&t=${timestamp}`;
    
    try {
        const res = await fetch(url);
        const text = await res.text();
        const jsonString = text.match(/google\.visualization\.Query\.setResponse\((.*)\);/s)?.[1];
        
        if (!jsonString) {
             return `FAILURE\n  - Reason: Invalid response received. The sheet might not be published or the name is wrong.\n  - Details: Raw response from Google starts with: ${text.slice(0, 150)}`;
        }
        
        const data = JSON.parse(jsonString);

        if (data.status === 'error') {
            return `FAILURE\n  - Reason: Google Sheets API returned an error.\n  - Details: ${JSON.stringify(data.errors)}`;
        }
        
        const rowCount = data.table?.rows?.length ?? 0;
        const colCount = data.table?.cols?.length ?? 0;
        const headers = data.table?.cols?.map((c: any) => `"${c.label}"` || '"NO_LABEL"').join(', ') || 'NONE';

        return `SUCCESS\n  - Rows Found: ${rowCount}\n  - Columns Found: ${colCount}\n  - Column Labels: [${headers}]`;

    } catch (e: any) {
        return `FAILURE\n  - Reason: An unexpected error occurred during the fetch.\n  - Details: ${e.message}`;
    }
}


export async function getDebugInfo(): Promise<string> {
    const sheetNames = ['Questions', 'Options', 'Jobs', 'OptionJobMap'];
    const results = await Promise.all(
        sheetNames.map(name => fetchSheetForDebug(name))
    );

    const report = results.map((result, index) => {
        const name = sheetNames[index];
        return `--- Fetching sheet: "${name}" ---\n${result}`;
    });

    return `Spreadsheet ID: ${SPREADSHEET_ID}\n\n${report.join('\n\n')}`;
}