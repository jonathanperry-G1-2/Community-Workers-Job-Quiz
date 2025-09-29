import React, { useState, useCallback, useEffect } from 'react';
import { GameState, QuizData, Question as QuestionType } from './types';
import StartScreen from './components/StartScreen';
import QuizScreen from './components/QuizScreen';
import ResultsScreen from './components/ResultsScreen';
import ProgressBar from './components/ProgressBar';
import { getQuizData, getDebugInfo } from './utils/googleSheetParser';

// A simple loading screen component
const LoadingScreen: React.FC = () => (
    <div className="flex flex-col items-center justify-center h-full w-full text-white">
        <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-white"></div>
        <p className="mt-4 text-xl font-semibold">Loading Quiz...</p>
    </div>
);

// A simple error screen component
const ErrorScreen: React.FC<{ message: string; onRetry: () => void; debugInfo: string | null; }> = ({ message, onRetry, debugInfo }) => {
    const [showDebug, setShowDebug] = useState(false);

    return (
        <div className="flex flex-col items-center justify-center h-full w-full text-white p-8 text-center">
            <h2 className="text-2xl font-bold mb-4">Oops! Something went wrong.</h2>
            <p className="text-lg mb-6">{message}</p>
            <button onClick={onRetry} className="bg-yellow-400 text-gray-800 font-bold py-2 px-6 rounded-full hover:bg-yellow-500 transition-colors">
                Try Again
            </button>
            {debugInfo && (
                <div className="mt-6">
                    <button onClick={() => setShowDebug(!showDebug)} className="text-sm text-gray-300 hover:text-white underline">
                        {showDebug ? 'Hide' : 'Show'} Technical Details
                    </button>
                    {showDebug && (
                        <pre className="mt-4 p-4 bg-black/30 rounded-lg text-left text-xs whitespace-pre-wrap font-mono max-w-full overflow-x-auto">
                            {debugInfo}
                        </pre>
                    )}
                </div>
            )}
        </div>
    );
};


const App: React.FC = () => {
    const [gameState, setGameState] = useState<GameState>(GameState.Start);
    const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
    const [answers, setAnswers] = useState<string[]>([]);
    const [studentName, setStudentName] = useState('');
    const [studentClass, setStudentClass] = useState('');

    // Data fetching state
    const [quizData, setQuizData] = useState<QuizData | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [debugInfo, setDebugInfo] = useState<string | null>(null);

    const fetchAndSetData = useCallback(async () => {
        setIsLoading(true);
        setError(null);
        setDebugInfo(null);
        try {
            const data = await getQuizData();
            setQuizData(data);
        } catch (e: any) {
            setError(e.message || 'Failed to load quiz data. Please check your internet connection and try again.');
            // Even if getQuizData fails, try to get debug info
            try {
                const debug = await getDebugInfo();
                setDebugInfo(debug);
            } catch (debugError) {
                // If the debug fetch also fails, at least show the primary error
                console.error("Failed to fetch debug info:", debugError);
            }
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchAndSetData();
    }, [fetchAndSetData]);

    const handleStartQuiz = useCallback((name: string, className: string) => {
        setStudentName(name);
        setStudentClass(className);
        setGameState(GameState.Quiz);
        setCurrentQuestionIndex(0);
        setAnswers([]);
    }, []);

    const handleRestart = useCallback(() => {
        setGameState(GameState.Start);
        setCurrentQuestionIndex(0);
        setAnswers([]);
        setStudentName('');
        setStudentClass('');
    }, []);

    const handleSelectChoice = useCallback((optionId: string) => {
        setAnswers(prev => [...prev, optionId]);

        setTimeout(() => {
            if (quizData && currentQuestionIndex < quizData.questions.length - 1) {
                setCurrentQuestionIndex(prevIndex => prevIndex + 1);
            } else {
                setGameState(GameState.Results);
            }
        }, 500);
    }, [currentQuestionIndex, quizData]);
    
    const currentQuestion: QuestionType | undefined = quizData?.questions[currentQuestionIndex];

    const renderContent = () => {
        if (isLoading) {
            return <LoadingScreen />;
        }
        if (error) {
            return <ErrorScreen message={error} onRetry={fetchAndSetData} debugInfo={debugInfo} />;
        }

        switch (gameState) {
            case GameState.Start:
                return <StartScreen onStart={handleStartQuiz} />;
            case GameState.Quiz:
                return currentQuestion && quizData ? (
                    <>
                        <QuizScreen 
                            question={currentQuestion}
                            onSelectChoice={handleSelectChoice}
                        />
                        <ProgressBar 
                            current={currentQuestionIndex} 
                            total={quizData.questions.length} 
                        />
                    </>
                ) : null;
            case GameState.Results:
                return quizData ? (
                    <ResultsScreen 
                        answers={answers}
                        quizData={quizData} 
                        onRestart={handleRestart}
                        studentName={studentName}
                        studentClass={studentClass}
                    />
                ) : null;
            default:
                return null;
        }
    };

    return (
        <main className="font-sans bg-gradient-to-br from-indigo-400 to-purple-600 h-screen w-screen overflow-hidden relative text-white">
            {renderContent()}
        </main>
    );
};

export default App;