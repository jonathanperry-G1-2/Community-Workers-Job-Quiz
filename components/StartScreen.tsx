import React, { useState } from 'react';

interface StartScreenProps {
    onStart: (name: string, className: string) => void;
}

const StartScreen: React.FC<StartScreenProps> = ({ onStart }) => {
    const [name, setName] = useState('');
    const [className, setClassName] = useState('');

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (name.trim() && className.trim()) {
            onStart(name, className);
        }
    };

    return (
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-md p-4">
            <div className="bg-white/30 backdrop-blur-md rounded-2xl shadow-2xl p-8 text-center">
                <h1 className="text-4xl font-bold mb-2">🚀</h1>
                <h2 className="text-3xl font-bold mb-6">What is your dream job in your community?</h2>
                <form onSubmit={handleSubmit} className="space-y-6">
                    <div>
                        <input
                            type="text"
                            placeholder="Your Name"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            className="w-full px-4 py-3 bg-white/50 text-gray-800 placeholder-gray-600 rounded-lg focus:outline-none focus:ring-4 focus:ring-purple-300 transition"
                            aria-label="Your Name"
                            required
                        />
                    </div>
                    <div>
                        <input
                            type="text"
                            placeholder="Your Class (eg. G2 Pioneers)"
                            value={className}
                            onChange={(e) => setClassName(e.target.value)}
                            className="w-full px-4 py-3 bg-white/50 text-gray-800 placeholder-gray-600 rounded-lg focus:outline-none focus:ring-4 focus:ring-purple-300 transition"
                            aria-label="Your Class"
                            required
                        />
                    </div>
                    <button
                        type="submit"
                        className="w-full bg-gradient-to-br from-yellow-400 to-red-500 rounded-lg py-3 text-white font-bold text-xl shadow-lg transform hover:scale-105 transition-transform duration-300 ease-in-out focus:outline-none focus:ring-4 focus:ring-yellow-300 disabled:opacity-50 disabled:cursor-not-allowed"
                        disabled={!name.trim() || !className.trim()}
                        aria-label="Start Quiz"
                    >
                        Start Quiz
                    </button>
                </form>
            </div>
        </div>
    );
};

export default StartScreen;