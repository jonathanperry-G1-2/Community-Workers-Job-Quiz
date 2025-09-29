import React from 'react';
import { ScoringResults } from '../types';

interface ReportModalProps {
    isOpen: boolean;
    onClose: () => void;
    studentName: string;
    studentClass: string;
    results: ScoringResults;
    geminiDescription: string;
}

const ReportModal: React.FC<ReportModalProps> = ({ 
    isOpen, 
    onClose, 
    studentName, 
    studentClass, 
    results,
    geminiDescription 
}) => {
    if (!isOpen) return null;

    const handlePrint = () => {
        window.print();
    };

    const topJobText = results.topJobs.length > 0
        ? results.topJobs.map(j => j.job_name).join(' / ')
        : 'N/A';

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 printable-area print:bg-white print:items-start print:p-0">
            <div className="bg-white text-gray-800 p-8 rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto print:shadow-none print:max-h-full print:h-full print:rounded-none">
                <div id="printable-report">
                    <h2 className="text-2xl font-bold mb-4 text-gray-900">Career Explorer Report</h2>
                    <div className="grid grid-cols-2 gap-x-4 gap-y-2 mb-4">
                        <p><strong>Student:</strong> {studentName}</p>
                        <p><strong>Class:</strong> {studentClass}</p>
                        <p><strong>Date:</strong> {new Date().toLocaleDateString()}</p>
                    </div>
                    <hr className="my-4" />
                    <div className="space-y-4 text-sm">
                        <div>
                            <h3 className="font-bold text-gray-900">Top Job Suggestion(s):</h3>
                            <p>{topJobText}</p>
                        </div>
                        <div>
                            <h3 className="font-bold text-gray-900">Full Score Report:</h3>
                            <table className="w-full text-left border-collapse mt-2">
                                <thead>
                                    <tr>
                                        <th className="border-b-2 p-2 font-semibold">Job / Career</th>
                                        <th className="border-b-2 p-2 font-semibold">Score</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {results.sortedScores.map((scoreItem) => (
                                        <tr key={scoreItem.job_id}>
                                            <td className="border-b p-2">{scoreItem.job_name}</td>
                                            <td className="border-b p-2">{scoreItem.score}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                        <div>
                            <h3 className="font-bold text-gray-900">Personalized Insight:</h3>
                            <p className="mt-1">{geminiDescription}</p>
                        </div>
                    </div>
                </div>
                <div className="flex justify-end space-x-4 mt-6 print:hidden">
                    <button onClick={onClose} className="bg-gray-300 text-gray-800 font-bold py-2 px-4 rounded-full hover:bg-gray-400 transition-colors">Close</button>
                    <button onClick={handlePrint} className="bg-purple-600 text-white font-bold py-2 px-4 rounded-full hover:bg-purple-700 transition-colors">Print</button>
                </div>
            </div>
        </div>
    );
};

export default ReportModal;
