import { Job, OptionJobMapItem, ScoringResults, ScoreEntry } from '../types';

export function computeScores(
    selectedOptionIds: string[],
    jobs: Job[],
    optionJobMap: OptionJobMapItem[]
): ScoringResults {

    // Build map option_id -> [job_id,...]
    const optToJobs = optionJobMap.reduce((acc, item) => {
        if (!acc[item.option_id]) {
            acc[item.option_id] = [];
        }
        acc[item.option_id].push(item.job_id);
        return acc;
    }, {} as Record<string, string[]>);

    // Count scores
    const counts: Record<string, number> = {}; // { [job_id]: count }
    for (const oid of selectedOptionIds) {
        const mappedJobIds = optToJobs[oid] || [];
        for (const jid of mappedJobIds) {
            counts[jid] = (counts[jid] || 0) + 1;
        }
    }

    // Find max score
    const entries = Object.entries(counts);
    if (!entries.length) {
        return { counts: {}, topJobs: [], sortedScores: [] };
    }
    const maxScore = Math.max(...entries.map(([,v])=>v));
    const topJobIds = entries.filter(([,v])=>v===maxScore).map(([k])=>k);

    // Add friendly names + create sorted report
    const idToJob = Object.fromEntries(jobs.map(j => [j.id, j]));
    
    const sortedScores: ScoreEntry[] = entries
        .map(([jid, score]) => ({ 
            job_id: jid, 
            job_name: idToJob[jid]?.name || `Unknown Job (${jid})`, 
            score
        }))
        .sort((a,b) => b.score - a.score);

    const topJobs = topJobIds.map(jid => ({ 
        job_id: jid, 
        job_name: idToJob[jid]?.name || `Unknown Job (${jid})` 
    }));
    
    const countsByName = Object.fromEntries(sortedScores.map(s => [s.job_name, s.score]));

    return { counts: countsByName, topJobs, sortedScores };
}
