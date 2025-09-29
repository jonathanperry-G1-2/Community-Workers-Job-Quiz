import React, { useMemo, useState, useEffect } from 'react';
import { QuizData, ScoringResults } from '../types';
import { GoogleGenAI } from "@google/genai";
import ReportModal from './ReportModal';
import { computeScores } from '../utils/scoring';
import { SCRIPT_URL } from '../config';

interface ResultsScreenProps {
    answers: string[];
    quizData: QuizData;
    onRestart: () => void;
    studentName: string;
    studentClass: string;
}

const ResultsScreen: React.FC<ResultsScreenProps> = ({ answers, quizData, onRestart, studentName, studentClass }) => {
    const [geminiDescription, setGeminiDescription] = useState<string>('');
    const [isLoading, setIsLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);
    const [isReportVisible, setIsReportVisible] = useState(false);
    const [submissionStatus, setSubmissionStatus] = useState<'idle' | 'submitting' | 'success' | 'error'>('idle');


    const results = useMemo<ScoringResults>(() => {
        return computeScores(answers, quizData.jobs, quizData.optionJobMap);
    }, [answers, quizData]);

    const topJobs = results.topJobs;
    const otherResults = results.sortedScores.filter(
        score => !topJobs.some(topJob => topJob.job_id === score.job_id)
    ).slice(0, 2);

    useEffect(() => {
        const generateDescription = async () => {
            if (topJobs.length === 0) {
                setIsLoading(false);
                setGeminiDescription("You have a balanced set of interests! This means you're open to many different possibilities. Keep exploring activities you enjoy to discover what you're most passionate about.");
                return;
            }

            try {
                const ai = new GoogleGenAI({ apiKey: process.env.API_KEY as string });

                const topJobsText = topJobs.map(j => j.job_name).join(' or ');
                const scoresText = results.sortedScores.slice(0, 5).map(s => `${s.job_name} (Score: ${s.score})`).join(', ');

                const prompt = `You are a friendly and encouraging career counselor for a young person named ${studentName}. Their quiz results suggest their top job interests are: ${topJobsText}. Their top traits based on scores are: ${scoresText}.

Based on these results, write a personalized summary of about 50-70 words. Explain why these jobs might be a good fit and encourage them to explore these paths. Use a warm, positive tone.`;

                const response = await ai.models.generateContent({
                    model: 'gemini-2.5-flash',
                    contents: prompt,
                });

                setGeminiDescription(response.text);
            } catch (e) {
                console.error(e);
                setError('Could not generate personalized insight. Please try again later.');
                setGeminiDescription('Your unique mix of traits opens up many possibilities! Whether it is helping others, being creative, or using technology, you have the potential to shine in fields you are passionate about.');
            } finally {
                setIsLoading(false);
            }
        };

        generateDescription();
    }, [results, topJobs, studentName]);

    // Effect to submit results to Google Sheet via Apps Script
    useEffect(() => {
        const submitResults = async () => {
             // Don't submit if it's the placeholder URL, if data isn't ready, or if already submitted/submitting.
            if (!SCRIPT_URL || SCRIPT_URL === 'YOUR_GOOGLE_APPS_SCRIPT_URL_HERE' || submissionStatus !== 'idle' || isLoading) {
                if (SCRIPT_URL === 'YOUR_GOOGLE_APPS_SCRIPT_URL_HERE' && !isLoading) {
                    console.warn('Google Apps Script URL is not set in config.ts. Results will not be saved.');
                }
                return;
            }
            
            setSubmissionStatus('submitting');

            const payload = {
                studentName,
                studentClass,
                topJobs: topJobs.map(j => j.job_name).join(' / '),
                geminiDescription,
                allScores: JSON.stringify(results.sortedScores)
            };

            try {
                // We use "text/plain" content type to avoid a CORS pre-flight request, which Apps Script doesn't handle easily.
                const response = await fetch(SCRIPT_URL, {
                    method: 'POST',
                    headers: {
                        "Content-Type": "text/plain;charset=utf-8",
                    },
                    body: JSON.stringify(payload)
                });

                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                const result = await response.json();
                if (result.status === 'success') {
                    setSubmissionStatus('success');
                } else {
                    throw new Error(result.message || 'Submission failed in script.');
                }
            } catch (error) {
                console.error('Failed to submit results:', error);
                setSubmissionStatus('error');
            }
        };

        submitResults();
    }, [isLoading, studentName, studentClass, topJobs, geminiDescription, results, submissionStatus]);

    const renderSubmissionStatus = () => {
        if (SCRIPT_URL === 'YOUR_GOOGLE_APPS_SCRIPT_URL_HERE' && !isLoading) {
            return (
                <p className="text-xs text-amber-800 bg-amber-100 p-2 rounded-md mt-6 text-center">
                    <b>Action Required:</b> To save results to your spreadsheet, paste your Apps Script URL into the <code>config.ts</code> file.
                </p>
            );
        }
    
        switch (submissionStatus) {
            case 'submitting':
                return (
                    <div className="flex items-center justify-center text-sm text-gray-500 mt-6">
                        <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-gray-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        <span>Saving results to spreadsheet...</span>
                    </div>
                );
            case 'success':
                return <p className="text-sm text-green-600 mt-6 text-center">✓ Results saved to spreadsheet.</p>;
            case 'error':
                return <p className="text-sm text-red-600 mt-6 text-center">✗ Could not save results. Please check the console for details.</p>;
            case 'idle':
            default:
                return <div className="h-5 mt-6"></div>; // Placeholder to prevent layout shift
        }
    };

    return (
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-lg p-4">
             <div className="bg-white/95 text-gray-800 p-8 rounded-2xl shadow-2xl text-center backdrop-blur-md animate-fade-in-up">
                <h1 className="text-4xl font-bold mb-4">🎉 Your Results, {studentName}! 🎉</h1>
                <p className="text-lg text-gray-600 mb-8">Based on your choices, here are some jobs you might love:</p>
                
                {topJobs.length > 0 && (
                    <div className="mb-8 animate-fade-in-up" style={{ animationDelay: '0.2s' }}>
                        <h2 className="text-xl text-gray-700 font-semibold mb-2">Your top job suggestions are:</h2>
                        <h3 className="text-3xl font-bold text-indigo-600 mb-3">
                            {topJobs.map(j => j.job_name).join(' or ')}
                        </h3>
                    </div>
                )}

                {otherResults.length > 0 && (
                     <div className="border-t-2 border-gray-200 pt-6 animate-fade-in-up" style={{ animationDelay: '0.4s' }}>
                        <h3 className="text-xl font-bold text-gray-700 mb-4">Other directions you might enjoy:</h3>
                        <div className="space-y-4">
                            {otherResults.map((job, index) => (
                                <div key={job.job_id} className="animate-fade-in-up" style={{ animationDelay: `${0.6 + index * 0.2}s` }}>
                                    <h4 className="text-2xl font-semibold text-purple-600">{job.job_name}</h4>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
                
                <div className="border-t-2 border-gray-200 pt-6 mt-6 animate-fade-in-up" style={{ animationDelay: '0.8s' }}>
                    <h3 className="text-xl font-bold text-gray-700 mb-4">Personalized Insight</h3>
                    {isLoading && <p className="text-gray-600">🧠 Generating your personalized insight...</p>}
                    {error && !isLoading && <p className="text-red-500">{error}</p>}
                    {!isLoading && geminiDescription && (
                        <p className="text-gray-600 text-base text-left bg-gray-100 p-4 rounded-lg">
                            {geminiDescription}
                        </p>
                    )}
                </div>

                {renderSubmissionStatus()}

                <div className="mt-4 flex flex-col sm:flex-row justify-center items-center space-y-4 sm:space-y-0 sm:space-x-4">
                    <button
                        onClick={onRestart}
                        className="bg-purple-600 text-white font-bold py-3 px-8 rounded-full hover:bg-purple-700 transition-all duration-300 text-lg transform hover:scale-105 focus:outline-none focus:ring-4 focus:ring-purple-300"
                    >
                        Play Again
                    </button>
                    <button
                        onClick={() => setIsReportVisible(true)}
                        className="bg-indigo-600 text-white font-bold py-3 px-8 rounded-full hover:bg-indigo-700 transition-all duration-300 text-lg transform hover:scale-105 focus:outline-none focus:ring-4 focus:ring-indigo-300"
                    >
                        Export Report
                    </button>
                </div>
            </div>
            <ReportModal 
                isOpen={isReportVisible}
                onClose={() => setIsReportVisible(false)}
                studentName={studentName}
                studentClass={studentClass}
                results={results}
                geminiDescription={geminiDescription}
            />
            <style>{`
                @keyframes fade-in-up {
                    from { opacity: 0; transform: translateY(20px) scale(0.98); }
                    to { opacity: 1; transform: translateY(0) scale(1); }
                }
                .animate-fade-in-up {
                    animation: fade-in-up 0.6s ease-out forwards;
                    opacity: 0;
                }
            `}</style>
        </div>
    );
};

export default ResultsScreen;