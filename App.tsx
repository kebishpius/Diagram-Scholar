import React, { useState, useRef } from 'react';
import { AnalysisResult, ProcessingState } from './types';
import { analyzeImage, generateMoreQuestions } from './services/geminiService';
import ExplanationView from './components/ExplanationView';
import QuizView from './components/QuizView';

const App: React.FC = () => {
  const [image, setImage] = useState<string | null>(null);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [processingState, setProcessingState] = useState<ProcessingState>({ status: 'idle' });
  const [isDragging, setIsDragging] = useState(false);
  const [isGeneratingMore, setIsGeneratingMore] = useState(false);
  
  // Use a ref for the file input to easily trigger it programmatically
  const fileInputRef = useRef<HTMLInputElement>(null);

  const processFile = async (file: File) => {
    // Reset previous state
    setImage(null);
    setResult(null);
    setProcessingState({ status: 'analyzing' });

    // Validate type roughly
    if (!file.type.startsWith('image/')) {
      setProcessingState({ status: 'error', error: 'Please upload a valid image file.' });
      return;
    }

    try {
      const base64Data = await readFileAsBase64(file);
      setImage(base64Data);

      // Extract raw base64 string without data prefix
      const rawBase64 = base64Data.split(',')[1];
      const mimeType = file.type;

      // Call Gemini API
      const analysisData = await analyzeImage(rawBase64, mimeType);
      setResult(analysisData);
      setProcessingState({ status: 'complete' });

    } catch (err: any) {
      setProcessingState({ 
        status: 'error', 
        error: err.message || 'An unexpected error occurred while processing the image.' 
      });
    }
  };

  const handleGenerateMoreQuestions = async () => {
    if (!image || !result) return;
    
    setIsGeneratingMore(true);
    try {
      const rawBase64 = image.split(',')[1];
      const mimeType = image.match(/data:([^;]+);/)?.[1] || 'image/png';
      
      const newQuestions = await generateMoreQuestions(rawBase64, mimeType);
      
      setResult({
        ...result,
        quiz: newQuestions
      });
    } catch (error) {
      console.error("Failed to generate more questions", error);
      // Optional: Add a toast notification here
    } finally {
      setIsGeneratingMore(false);
    }
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    await processFile(file);
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
    e.dataTransfer.dropEffect = 'copy';
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = async (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    
    const file = e.dataTransfer.files?.[0];
    if (file) {
      await processFile(file);
    }
  };

  const readFileAsBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  const handleReset = () => {
    setImage(null);
    setResult(null);
    setProcessingState({ status: 'idle' });
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const triggerUpload = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="min-h-screen bg-[#020617] text-slate-100 flex flex-col font-sans overflow-x-hidden">
      {/* Header */}
      <header className="border-b border-indigo-900/50 bg-[#020617]/90 backdrop-blur-md sticky top-0 z-50 flex-shrink-0 h-16 sm:h-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-full flex items-center justify-between">
          <div className="flex items-center space-x-3 sm:space-x-4">
            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg bg-gradient-to-br from-amber-500 to-amber-700 flex items-center justify-center shadow-lg shadow-amber-500/10 border border-amber-400/20">
              <svg className="w-5 h-5 sm:w-6 sm:h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
              </svg>
            </div>
            <div>
              <h1 className="text-lg sm:text-xl font-bold tracking-tight text-white leading-none">
                Diagram<span className="text-amber-400">Scholar</span>
              </h1>
              <p className="text-[10px] sm:text-xs text-indigo-300 font-medium tracking-wider uppercase mt-0.5 sm:mt-1">AI-Powered Learning Tool</p>
            </div>
          </div>
          {processingState.status === 'complete' && (
            <button
              onClick={handleReset}
              className="text-xs sm:text-sm font-medium text-indigo-300 hover:text-amber-400 transition-colors flex items-center space-x-1 sm:space-x-2 px-3 py-1.5 sm:px-4 sm:py-2 rounded-lg hover:bg-indigo-950/50"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
              </svg>
              <span className="hidden sm:inline">Analyze New</span>
              <span className="sm:hidden">New</span>
            </button>
          )}
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-grow flex flex-col items-center justify-start p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto w-full">
        
        {/* State: IDLE - Upload Area */}
        {processingState.status === 'idle' && (
          <div className="flex flex-col items-center justify-center w-full max-w-3xl mt-8 sm:mt-16 animate-in fade-in zoom-in duration-500">
            <div className="text-center mb-8 sm:mb-12">
              <h2 className="text-3xl sm:text-5xl font-extrabold text-white mb-4 sm:mb-6 tracking-tight leading-tight">
                Master Technical <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-amber-200">Diagrams</span>
              </h2>
              <p className="text-base sm:text-lg text-indigo-200/80 max-w-2xl mx-auto leading-relaxed px-4">
                Upload your study materials. Our AI analyzes visual data to provide academic explanations and interactive practice quizzes instantly.
              </p>
            </div>

            <div 
              onClick={triggerUpload}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              className={`w-full h-64 sm:h-72 border-2 border-dashed rounded-3xl flex flex-col items-center justify-center cursor-pointer transition-all duration-300 group shadow-2xl backdrop-blur-sm px-4 text-center ${
                isDragging 
                  ? "border-amber-400 bg-indigo-900/40 scale-105" 
                  : "border-indigo-800 hover:border-amber-500/50 hover:bg-indigo-950/30 bg-slate-900/50"
              }`}
            >
              <div className={`p-4 sm:p-5 rounded-full mb-4 sm:mb-6 transition-transform duration-300 shadow-xl border ${
                isDragging 
                  ? "scale-110 border-amber-400 bg-amber-500/20" 
                  : "group-hover:scale-110 bg-[#0f172a] border-indigo-900 group-hover:border-amber-500/30"
              }`}>
                <svg className={`w-8 h-8 sm:w-10 sm:h-10 transition-colors ${isDragging ? "text-amber-300" : "text-amber-500"}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
              <p className={`text-lg sm:text-xl font-semibold transition-colors ${isDragging ? "text-amber-300" : "text-slate-200 group-hover:text-amber-400"}`}>
                {isDragging ? "Drop to Analyze" : "Select or drop a diagram here"}
              </p>
              <p className="text-xs sm:text-sm text-slate-500 mt-2">Compatible with JPG, PNG, WEBP</p>
            </div>
            <input 
              type="file" 
              ref={fileInputRef} 
              onChange={handleFileChange} 
              className="hidden" 
              accept="image/*" 
            />
          </div>
        )}

        {/* State: ANALYZING - Loading Spinner */}
        {processingState.status === 'analyzing' && (
          <div className="flex flex-col items-center justify-center w-full h-[60vh] animate-in fade-in duration-700">
             {image && (
                <div className="p-1 rounded-xl bg-gradient-to-br from-amber-500/20 to-indigo-500/20 mb-8 sm:mb-10">
                  <img 
                    src={image} 
                    alt="Analyzing" 
                    className="w-32 h-32 sm:w-40 sm:h-40 object-cover rounded-lg opacity-80" 
                  />
                </div>
              )}
            <div className="relative w-16 h-16 sm:w-20 sm:h-20">
              <div className="absolute top-0 left-0 w-full h-full border-4 border-indigo-900/50 rounded-full"></div>
              <div className="absolute top-0 left-0 w-full h-full border-4 border-amber-500 rounded-full animate-spin border-t-transparent"></div>
            </div>
            <h3 className="mt-6 sm:mt-8 text-xl sm:text-2xl font-bold text-white tracking-wide text-center">Analyzing Visual Data...</h3>
            <p className="mt-2 text-sm sm:text-base text-indigo-300 animate-pulse text-center">Constructing explanation and formulating quiz</p>
          </div>
        )}

        {/* State: ERROR */}
        {processingState.status === 'error' && (
          <div className="flex flex-col items-center justify-center w-full mt-12 sm:mt-20 text-center">
            <div className="p-4 bg-red-900/20 rounded-full mb-6 border border-red-500/20">
              <svg className="w-10 h-10 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <h3 className="text-xl font-bold text-white mb-2">Processing Error</h3>
            <p className="text-slate-400 mb-8 max-w-md">{processingState.error}</p>
            <button 
              onClick={handleReset}
              className="px-8 py-3 bg-indigo-900 hover:bg-indigo-800 text-white rounded-lg transition-colors border border-indigo-700 shadow-lg"
            >
              Try Again
            </button>
          </div>
        )}

        {/* State: COMPLETE - Results View */}
        {processingState.status === 'complete' && result && (
          <div className="w-full flex flex-col items-center animate-in fade-in slide-in-from-bottom-8 duration-700 h-full">
            
            {/* Top Section: Image Preview (Expanded size) */}
            <div className="w-full mb-6 sm:mb-8 bg-[#0f172a] rounded-xl p-3 sm:p-4 border border-indigo-900/50 shadow-2xl overflow-hidden backdrop-blur-sm relative group flex-shrink-0">
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent pointer-events-none"></div>
              {/* Increased height to h-64 sm:h-80 lg:h-96 for better visibility */}
              <div className="relative w-full h-64 sm:h-80 lg:h-96 flex items-center justify-center rounded-lg overflow-hidden bg-black/20">
                <img 
                  src={image!} 
                  alt="Uploaded Diagram" 
                  className="max-w-full max-h-full object-contain"
                />
              </div>
               <div className="absolute bottom-3 left-4">
                <h2 className="text-white font-bold text-sm sm:text-lg drop-shadow-md">Original Source</h2>
              </div>
            </div>

            {/* Bottom Section: Split View (Explanation vs Quiz) */}
            {/* 
                Calculated height explanation:
                100vh 
                - 5rem (header) 
                - 2rem (padding top) 
                - 2rem (padding bottom)
                - 24rem (image section roughly)
                - 2rem (gap)
                = roughly 35rem of used space
             */}
            <div className="w-full grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8 lg:h-[calc(100vh-35rem)] lg:min-h-[500px]">
              
              {/* Left Column: Explanation */}
              <div className="h-[600px] lg:h-full">
                <ExplanationView 
                  title={result.title} 
                  explanation={result.explanation}
                  relationshipDescription={result.relationshipDescription}
                />
              </div>

              {/* Right Column: Quiz */}
              <div className="h-[500px] lg:h-full">
                 <QuizView 
                   questions={result.quiz} 
                   onGenerateMore={handleGenerateMoreQuestions}
                   isGeneratingMore={isGeneratingMore}
                   imageSrc={image}
                 />
              </div>

            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default App;