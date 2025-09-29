
import React from 'react';

interface ProgressBarProps {
    current: number;
    total: number;
}

const ProgressBar: React.FC<ProgressBarProps> = ({ current, total }) => {
    const progressPercentage = total > 0 ? ((current + 1) / total) * 100 : 0;

    return (
        <div className="fixed bottom-5 left-1/2 -translate-x-1/2 w-4/5 max-w-2xl h-6 bg-white/30 rounded-full overflow-hidden shadow-md z-20">
            <div
                className="h-full bg-gradient-to-r from-green-300 to-cyan-400 rounded-full transition-all duration-500 ease-out"
                style={{ width: `${progressPercentage}%` }}
            ></div>
        </div>
    );
};

export default ProgressBar;
