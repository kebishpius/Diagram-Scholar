import React, { useState, useRef, useEffect } from 'react';
import { QuizQuestion } from '../types';
import { askAiTutor } from '../services/geminiService';

interface QuizViewProps {
  questions: QuizQuestion[];
  onGenerateMore?: () => void;
  isGeneratingMore?: boolean;
  imageSrc?: string | null;
}

interface ChatMessage {
  id: string;
  sender: 'user' | 'ai';
  text: string;
}

const QuizView: React.FC<QuizViewProps> = ({ questions, onGenerateMore, isGeneratingMore = false, imageSrc }) => {
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [userAnswers, setUserAnswers] = useState<(number | null)[]>(new Array(questions.length).fill(null));
  const [showResults, setShowResults] = useState(false);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const resultRef = useRef<HTMLDivElement>(null);

  // Chat State
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [isChatLoading, setIsChatLoading] = useState(false);
  // Ref for the scrollable container instead of a dummy element at the bottom
  const chatContainerRef = useRef<HTMLDivElement>(null);

  // Reset internal state when questions prop changes
  useEffect(() => {
    setCurrentQuestionIndex(0);
    setUserAnswers(new Array(questions.length).fill(null));
    setShowResults(false);
    // Don't reset chat history here intentionally, unless image changes, but image change triggers full app reset.
  }, [questions]);

  // Scroll chat container to bottom on new message
  useEffect(() => {
    if (chatContainerRef.current) {
      // Use scrollTop instead of scrollIntoView to prevent page-level scrolling/jumping
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [chatMessages, isChatLoading]);

  const currentQuestion = questions[currentQuestionIndex];
  const currentAnswer = userAnswers[currentQuestionIndex];
  const isAnswered = currentAnswer !== null;

  // Focus management for accessibility
  useEffect(() => {
    if (showResults && resultRef.current) {
      resultRef.current.focus();
    } else if (!showResults && headingRef.current) {
      headingRef.current.focus();
    }
  }, [currentQuestionIndex, showResults]);

  const handleOptionClick = (index: number) => {
    if (isAnswered) return;
    
    const newAnswers = [...userAnswers];
    newAnswers[currentQuestionIndex] = index;
    setUserAnswers(newAnswers);
  };

  const handleNext = () => {
    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex((prev) => prev + 1);
    } else {
      setShowResults(true);
    }
  };

  const handlePrevious = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex((prev) => prev - 1);
    }
  };

  const resetQuiz = () => {
    setCurrentQuestionIndex(0);
    setUserAnswers(new Array(questions.length).fill(null));
    setShowResults(false);
  };

  const handleChatSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim() || !imageSrc || isChatLoading) return;

    const userMsg: ChatMessage = { id: Date.now().toString(), sender: 'user', text: chatInput };
    setChatMessages(prev => [...prev, userMsg]);
    setChatInput('');
    setIsChatLoading(true);

    try {
      const rawBase64 = imageSrc.split(',')[1];
      const mimeType = imageSrc.match(/data:([^;]+);/)?.[1] || 'image/png';
      
      const responseText = await askAiTutor(rawBase64, mimeType, userMsg.text);
      
      const aiMsg: ChatMessage = { id: (Date.now() + 1).toString(), sender: 'ai', text: responseText };
      setChatMessages(prev => [...prev, aiMsg]);
    } catch (error) {
      const errorMsg: ChatMessage = { id: (Date.now() + 1).toString(), sender: 'ai', text: "Sorry, I couldn't answer that right now." };
      setChatMessages(prev => [...prev, errorMsg]);
    } finally {
      setIsChatLoading(false);
    }
  };

  const calculateScore = () => {
    return userAnswers.reduce((score, answer, index) => {
      if (answer === questions[index].correctAnswerIndex) {
        return score + 1;
      }
      return score;
    }, 0);
  };

  const getFeedbackMessage = (percentage: number) => {
    if (percentage === 100) return "Excellent work!";
    if (percentage >= 60) return "Good job, keep studying!";
    return "Keep studying!";
  };

  // Reusable Chat Helper Function (Not a nested component)
  const renderChatSection = () => (
    <div className="mt-8 pt-6 border-t border-indigo-900/50">
      <h4 className="text-xs font-bold text-amber-500 uppercase tracking-widest mb-4 flex items-center">
        <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
        </svg>
        Need Clarification?
      </h4>
      
      <div className="bg-[#0B1021] rounded-xl border border-indigo-900/30 overflow-hidden">
        {chatMessages.length > 0 && (
          <div 
            ref={chatContainerRef}
            className="p-4 max-h-48 overflow-y-auto custom-scrollbar space-y-3 bg-[#020617]/50"
          >
            {chatMessages.map((msg) => (
              <div key={msg.id} className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[85%] rounded-lg px-3 py-2 text-sm leading-relaxed ${
                  msg.sender === 'user' 
                    ? 'bg-indigo-600 text-white rounded-br-none' 
                    : 'bg-[#1e293b] text-slate-200 border border-indigo-900/50 rounded-bl-none'
                }`}>
                  {msg.text}
                </div>
              </div>
            ))}
            {isChatLoading && (
              <div className="flex justify-start">
                <div className="bg-[#1e293b] rounded-lg rounded-bl-none px-3 py-2 border border-indigo-900/50 flex items-center space-x-1">
                  <div className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                  <div className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                  <div className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                </div>
              </div>
            )}
          </div>
        )}
        
        <form onSubmit={handleChatSubmit} className="relative flex items-center bg-[#1e293b]">
          <input 
            type="text" 
            value={chatInput}
            onChange={(e) => setChatInput(e.target.value)}
            placeholder="Ask a question about this diagram..."
            className="w-full bg-transparent text-slate-200 text-sm px-4 py-3 pr-10 outline-none placeholder:text-slate-500"
          />
          <button 
            type="submit" 
            disabled={!chatInput.trim() || isChatLoading}
            className="absolute right-2 p-1.5 text-indigo-400 hover:text-amber-400 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
            </svg>
          </button>
        </form>
      </div>
    </div>
  );

  if (questions.length === 0) {
    return (
      <div className="bg-[#0f172a] rounded-xl p-6 border border-indigo-900/50 flex flex-col items-center justify-center h-full text-center text-slate-400">
        <p>No quiz questions could be generated for this image.</p>
      </div>
    );
  }

  if (showResults) {
    const score = calculateScore();
    const percentage = Math.round((score / questions.length) * 100);

    return (
      <div 
        ref={resultRef}
        tabIndex={-1}
        className="bg-[#0f172a] rounded-xl p-5 border border-indigo-900/50 shadow-2xl h-full flex flex-col relative overflow-hidden outline-none" 
        role="alert" 
        aria-live="polite"
        aria-label="Quiz Results"
      >
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-amber-600 via-yellow-500 to-amber-600"></div>
        
        {/* Header - Matches Question View */}
        <div className="flex items-center justify-between mb-4 pb-3 border-b border-indigo-900/30 flex-shrink-0">
          <div className="flex items-center space-x-2">
            <div className="p-1.5 bg-amber-500/10 rounded-lg border border-amber-500/20" aria-hidden="true">
              <svg className="w-5 h-5 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h2 className="text-lg font-bold text-white tracking-tight">Results</h2>
          </div>
        </div>

        {/* Content Area - Scrollable, Top Aligned */}
        <div className="flex-grow overflow-y-auto pr-2 custom-scrollbar flex flex-col">
            
            <div className="flex flex-col items-center">
              <div className="relative mb-6 mt-4">
                  <div className="w-32 h-32 rounded-full border-4 border-indigo-900 flex items-center justify-center bg-[#0B1021] shadow-[0_0_30px_rgba(245,158,11,0.1)]">
                      <span className="text-4xl font-black text-amber-400">
                          {percentage}%
                      </span>
                  </div>
                  {percentage === 100 && (
                      <div className="absolute -top-2 -right-4 bg-amber-500 text-black text-xs font-bold px-2 py-1 rounded-full animate-bounce shadow-lg border border-white/20">
                          PERFECT
                      </div>
                  )}
              </div>

              <div className="bg-[#1e293b] p-5 rounded-xl border border-indigo-900/50 mb-8 max-w-sm w-full text-center shadow-lg">
                  <p className="text-xl font-bold text-amber-100 mb-2">
                   {getFeedbackMessage(percentage)}
                  </p>
                  <p className="text-slate-400 text-base">
                    You scored <span className="text-white font-bold">{score}</span> out of <span className="text-white font-bold">{questions.length}</span>
                  </p>
              </div>

              <div className="flex flex-col w-full gap-3 pb-4">
                <button
                  onClick={resetQuiz}
                  className="w-full px-6 py-3 bg-amber-600 hover:bg-amber-500 text-white rounded-xl font-bold transition-all shadow-lg hover:shadow-amber-500/20 border-b-4 border-amber-800 active:border-b-0 active:translate-y-1 focus:outline-none focus:ring-4 focus:ring-amber-400/50 focus:border-amber-300"
                >
                  Retake Assessment
                </button>
                
                {onGenerateMore && (
                  <button
                    onClick={onGenerateMore}
                    disabled={isGeneratingMore}
                    className={`w-full px-6 py-3 rounded-xl font-bold transition-all border shadow-lg focus:outline-none focus:ring-4 focus:ring-indigo-500/50
                      ${isGeneratingMore 
                        ? "bg-indigo-950/50 border-indigo-900 text-indigo-400 cursor-wait" 
                        : "bg-indigo-900 hover:bg-indigo-800 text-white border-indigo-700 hover:border-indigo-500 hover:shadow-indigo-500/20"}`}
                  >
                    {isGeneratingMore ? (
                      <span className="flex items-center justify-center gap-2">
                        <svg className="animate-spin h-5 w-5 text-indigo-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Creating New Questions...
                      </span>
                    ) : (
                      "Generate New Questions"
                    )}
                  </button>
                )}
              </div>
            </div>
            
            {/* Show chat in results view too */}
            {renderChatSection()}
            
            {/* Spacer */}
            <div className="h-4"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-[#0f172a] rounded-xl p-5 border border-indigo-900/50 shadow-2xl h-full flex flex-col relative overflow-hidden">
      <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-amber-600 via-yellow-500 to-amber-600 z-10"></div>
      
      {/* Header - Fixed at Top */}
      <div className="flex items-center justify-between mb-4 pb-3 border-b border-indigo-900/30 flex-shrink-0">
        <div className="flex items-center space-x-2">
          <div className="p-1.5 bg-amber-500/10 rounded-lg border border-amber-500/20" aria-hidden="true">
            <svg className="w-5 h-5 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
            </svg>
          </div>
          <h2 className="text-lg font-bold text-white tracking-tight">Quiz</h2>
        </div>
        <div 
          className="text-xs font-semibold text-indigo-200 bg-indigo-950 px-2.5 py-1 rounded-full border border-indigo-800 whitespace-nowrap" 
          role="status"
          aria-label={`Question ${currentQuestionIndex + 1} of ${questions.length}`}
        >
          <span className="text-amber-400">{currentQuestionIndex + 1}</span> / {questions.length}
        </div>
      </div>

      {/* Scrollable Container including Question, Options, AND Buttons */}
      <div className="flex-grow overflow-y-auto pr-2 custom-scrollbar">
        <h3 
          ref={headingRef}
          tabIndex={-1}
          className="text-base md:text-lg text-white font-medium mb-4 leading-snug outline-none"
        >
          {currentQuestion.question}
        </h3>

        <div className="space-y-2.5" role="radiogroup" aria-labelledby="question-heading">
          {currentQuestion.options.map((option, index) => {
            let buttonClass = "w-full text-left p-3 rounded-lg border transition-all duration-200 group relative overflow-hidden flex items-center outline-none focus:ring-4 focus:ring-amber-500/50 focus:border-amber-400 ";
            let statusIcon = null;
            let ariaLabel = `Option ${String.fromCharCode(65 + index)}: ${option}`;
            let ariaChecked = false;

            if (isAnswered) {
              if (index === currentQuestion.correctAnswerIndex) {
                // Correct Answer
                buttonClass += "bg-[#064e3b] border-[#34d399] text-white shadow-[0_0_15px_rgba(52,211,153,0.3)] ";
                statusIcon = (
                   <div className="ml-auto text-[#34d399]" aria-hidden="true">
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                      </svg>
                   </div>
                );
                ariaLabel += " (Correct Answer)";
              } else if (index === currentAnswer) {
                // User Selected Incorrectly
                buttonClass += "bg-[#7f1d1d] border-[#f87171] text-white ";
                statusIcon = (
                   <div className="ml-auto text-[#f87171]" aria-hidden="true">
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                   </div>
                );
                ariaLabel += " (Incorrect Selection)";
                ariaChecked = true;
              } else {
                // Unselected and not correct
                buttonClass += "bg-[#1e293b] border-transparent text-slate-500 opacity-50 cursor-not-allowed ";
              }
            } else {
              // Not Answered Yet
              buttonClass += "bg-[#1e293b] border-indigo-900/50 text-slate-200 hover:bg-[#25324d] hover:border-amber-500/50 hover:shadow-[0_0_10px_rgba(245,158,11,0.1)] cursor-pointer ";
            }

            return (
              <button
                key={index}
                role="radio"
                aria-checked={isAnswered ? (index === currentAnswer) : false}
                onClick={() => handleOptionClick(index)}
                disabled={isAnswered}
                aria-disabled={isAnswered}
                aria-label={ariaLabel}
                className={buttonClass}
              >
                <span className={`w-6 h-6 rounded-full border-2 flex-shrink-0 flex items-center justify-center mr-3 text-xs font-bold transition-colors ${
                  isAnswered && index === currentQuestion.correctAnswerIndex ? 'border-[#34d399] bg-[#34d399] text-black' :
                  isAnswered && index === currentAnswer ? 'border-[#f87171] bg-[#f87171] text-white' :
                  'border-indigo-700 text-indigo-400 group-hover:border-amber-400 group-hover:text-amber-400'
                }`} aria-hidden="true">
                  {String.fromCharCode(65 + index)}
                </span>
                <span className="text-sm md:text-base leading-tight">{option}</span>
                {statusIcon}
              </button>
            );
          })}
        </div>

        {isAnswered && (
          <div 
            className="mt-4 pt-3 border-t border-indigo-900/30 animate-in fade-in slide-in-from-bottom-2 duration-300" 
            role="status" 
            aria-live="polite"
          >
            <div className={`p-3 rounded-lg border-l-4 ${currentAnswer === currentQuestion.correctAnswerIndex ? 'bg-[#064e3b]/30 border-green-500' : 'bg-[#7f1d1d]/30 border-red-500'}`}>
              <p className="text-slate-200 text-sm md:text-base">
                <strong className={`block mb-0.5 uppercase tracking-wide text-[10px] ${currentAnswer === currentQuestion.correctAnswerIndex ? 'text-green-400' : 'text-red-400'}`}>
                  {currentAnswer === currentQuestion.correctAnswerIndex ? 'Correct' : 'Incorrect'}
                </strong>
                {currentQuestion.explanation}
              </p>
            </div>
          </div>
        )}

        {/* Buttons - Now inside the flow, immediately after options/explanation */}
        <div className="mt-6 pt-3 border-t border-indigo-900/30 flex justify-between items-center gap-3 pb-2">
          <button
            onClick={handlePrevious}
            disabled={currentQuestionIndex === 0}
            aria-label="Go to previous question"
            className={`flex-1 py-2.5 px-3 rounded-xl font-bold text-sm md:text-base transition-all flex items-center justify-center space-x-2 border outline-none focus:ring-4 focus:ring-indigo-500/50
              ${currentQuestionIndex === 0 
                ? 'bg-[#1e293b] border-transparent text-slate-600 cursor-not-allowed' 
                : 'bg-indigo-900/50 hover:bg-indigo-800 text-indigo-200 border-indigo-700 hover:border-indigo-500'}`}
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 17l-5-5m0 0l5-5m-5 5h12" />
            </svg>
            <span className="hidden sm:inline">Previous</span>
          </button>

          <button
            onClick={handleNext}
            aria-label={currentQuestionIndex < questions.length - 1 ? "Go to next question" : "Finish quiz and show score"}
            className="flex-[2] py-2.5 px-3 bg-amber-600 hover:bg-amber-500 text-white rounded-xl font-bold text-sm md:text-base transition-all shadow-lg hover:shadow-amber-500/20 flex items-center justify-center space-x-2 border-b-4 border-amber-800 active:border-b-0 active:translate-y-1 focus:ring-4 focus:ring-amber-500/50 focus:border-amber-300 outline-none"
          >
            <span>{currentQuestionIndex < questions.length - 1 ? "Next" : "Finish"}</span>
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
            </svg>
          </button>
        </div>
        
        {/* Chat Section */}
        {renderChatSection()}
        
        {/* Bottom padding spacer to ensure comfortable scrolling if needed */}
        <div className="h-2"></div>
      </div>
    </div>
  );
};

export default QuizView;