import React, { useState, useEffect } from 'react';
import { Question, Choice } from '../types';

interface QuizScreenProps {
    question: Question;
    onSelectChoice: (optionId: string) => void;
}

// Helper function for clarity and robustness in positioning choices
const getChoiceStyle = (index: number, total: number): React.CSSProperties => {
    const angleStep = (2 * Math.PI) / total;
    // Start from North (12 o'clock)
    const angle = angleStep * index - Math.PI / 2; 

    // Use a radius that ensures visibility on all screens.
    // Total layout size will be approx 88% of the smallest viewport dimension, leaving a good margin.
    const radius = 32; // in vmin

    const xOffset = Math.cos(angle) * radius;
    const yOffset = Math.sin(angle) * radius;

    return {
        // Use calc() for positioning relative to the center of the parent
        left: `calc(50% + ${xOffset}vmin)`,
        top: `calc(50% + ${yOffset}vmin)`,
        // translate(-50%, -50%) centers the choice circle on the calculated point
        transform: 'translate(-50%, -50%)',
        zIndex: 5,
    };
};

const QuizScreen: React.FC<QuizScreenProps> = ({ question, onSelectChoice }) => {
    const [isAnimatingOut, setIsAnimatingOut] = useState(false);
    
    const handleChoiceClick = (choice: Choice) => {
        setIsAnimatingOut(true);
        onSelectChoice(choice.id);
    };
    
    useEffect(() => {
        setIsAnimatingOut(false);
    }, [question]);

    return (
        <div className="w-full h-full relative">
            {/* Central Question Node */}
            <div 
              className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-col items-center justify-center bg-gradient-to-br from-yellow-400 to-red-500 rounded-full shadow-2xl transition-all duration-500 p-4 text-center w-[28vmin] h-[28vmin] max-w-48 max-h-48 ${isAnimatingOut ? 'scale-0 opacity-0' : 'scale-100 opacity-100'}`}
              style={{ zIndex: 10 }}
            >
                <div className="text-6xl">❓</div>
                <div className="text-white font-semibold mt-2 text-lg">
                    {question.text}
                </div>
            </div>

            {/* Choice Nodes */}
            {question.choices.map((choice, index) => {
                return (
                    <button
                        key={`${question.id}-${index}`}
                        onClick={() => handleChoiceClick(choice)}
                        className={`absolute w-[24vmin] h-[24vmin] max-w-36 max-h-36 bg-gradient-to-br from-blue-400 to-purple-400 rounded-full flex flex-col items-center justify-center cursor-pointer shadow-xl transform hover:scale-110 focus:outline-none focus:ring-4 focus:ring-blue-300 transition-all duration-500 overflow-hidden text-white ${isAnimatingOut ? 'scale-0 opacity-0' : 'scale-100 opacity-100'}`}
                        style={{
                            ...getChoiceStyle(index, question.choices.length),
                            // Stagger the animation for a nice effect
                            transitionDelay: `${50 * index}ms`,
                        }}
                    >
                        {choice.imageUrl && (
                            <>
                                <img src={choice.imageUrl} alt={choice.text} className="absolute inset-0 w-full h-full object-cover" />
                                <div className="absolute inset-0 bg-black/40"></div>
                            </>
                        )}
                        <div className="relative flex flex-col items-center justify-center text-center p-1">
                            {!choice.imageUrl && <div className="text-5xl">{choice.icon}</div>}
                            <div className="text-base font-semibold text-shadow">{choice.text}</div>
                        </div>
                    </button>
                );
            })}
            <style>{`
                .text-shadow {
                    text-shadow: 0 2px 4px rgba(0, 0, 0, 0.6);
                }
            `}</style>
        </div>
    );
};

export default QuizScreen;