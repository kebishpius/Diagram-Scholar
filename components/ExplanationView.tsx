import React, { useEffect, useRef, useState } from 'react';

interface ExplanationViewProps {
  title: string;
  explanation: string;
  relationshipDescription: string;
}

const ExplanationView: React.FC<ExplanationViewProps> = ({ title, explanation, relationshipDescription }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const bgRef = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Trigger fade-in animation shortly after mount
    const timer = setTimeout(() => setIsVisible(true), 50);
    return () => clearTimeout(timer);
  }, []);

  const handleScroll = () => {
    if (containerRef.current && bgRef.current) {
      const scrolled = containerRef.current.scrollTop;
      // Parallax effect: Move background down as content scrolls up (creating depth)
      // We move it at 60% of the scroll speed
      bgRef.current.style.transform = `translate3d(0, ${scrolled * 0.6}px, 0)`;
    }
  };

  // Simple markdown-to-JSX parser for basic formatting
  const formatText = (text: string) => {
    const lines = text.split('\n');
    const elements: React.ReactNode[] = [];
    let currentListItems: React.ReactNode[] = [];

    // Helper to render accumulated list items
    const renderList = (items: React.ReactNode[], key: string) => (
      <ul key={key} className="space-y-4 mb-8">
        {items}
      </ul>
    );

    const parseInlineStyles = (text: string) => {
      // Bold: **text**
      const parts = text.split(/(\*\*.*?\*\*)/g);
      return parts.map((part, i) => {
        if (part.startsWith('**') && part.endsWith('**')) {
          return (
            <strong key={i} className="text-amber-200 font-bold bg-amber-900/30 px-1 rounded-sm border-b border-amber-500/30">
              {part.slice(2, -2)}
            </strong>
          );
        }
        return part;
      });
    };

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const isBullet = line.trim().startsWith('- ');

      if (isBullet) {
        currentListItems.push(
          <li key={`li-${i}`} className="flex items-start pl-3 border-l-4 border-indigo-900/50 hover:border-amber-500 transition-colors group bg-[#0B1021] p-3 rounded-r-lg">
             <span className="text-amber-500 mr-3 mt-1.5 transition-transform group-hover:scale-110 select-none text-lg" aria-hidden="true">•</span>
             <span className="text-slate-200 leading-relaxed text-lg">{parseInlineStyles(line.replace('- ', ''))}</span>
          </li>
        );
        
        // If next line is NOT bullet or end of text, flush list
        const nextLine = lines[i + 1];
        if (!nextLine || !nextLine.trim().startsWith('- ')) {
          elements.push(renderList(currentListItems, `ul-${i}`));
          currentListItems = [];
        }
        continue;
      }
      
      // Headers
      if (line.startsWith('## ')) {
        elements.push(
          <h2 key={i} className="text-2xl md:text-3xl font-bold text-white mt-10 mb-6 border-b border-indigo-900/50 pb-3 flex items-center">
            {line.replace('## ', '')}
          </h2>
        );
      }
      else if (line.startsWith('### ')) {
        elements.push(
          <h3 key={i} className="text-xl font-bold text-amber-400 mt-8 mb-4 flex items-center uppercase tracking-wide text-sm">
            <span className="w-4 h-1 bg-amber-500 mr-3 inline-block rounded-full"></span>
            {line.replace('### ', '')}
          </h3>
        );
      }
      // Numbered lists
      else if (/^\d+\.\s/.test(line.trim())) {
        const match = line.match(/^(\d+)\.\s(.*)/);
        if (match) {
           elements.push(
             <div key={i} className="flex items-start mb-4 ml-1 bg-[#0B1021] p-3 rounded-lg border border-indigo-900/20">
              <span className="text-amber-500 font-mono font-bold mr-4 mt-0.5 text-xl opacity-80">{match[1]}.</span>
              <span className="text-slate-200 leading-relaxed text-lg">{parseInlineStyles(match[2])}</span>
            </div>
          );
        }
      }
      // Spacers
      else if (line.trim() === '') {
        elements.push(<div key={i} className="h-4" />);
      }
      // Paragraphs
      else {
        elements.push(
          <p key={i} className="text-slate-300 leading-relaxed mb-6 text-lg">
            {parseInlineStyles(line)}
          </p>
        );
      }
    }
    return elements;
  };

  return (
    <div 
      ref={containerRef}
      onScroll={handleScroll}
      className={`bg-[#0f172a] rounded-xl p-8 md:p-10 border border-indigo-900/50 shadow-2xl h-full overflow-y-auto relative scroll-smooth transition-all duration-1000 ease-out transform ${
        isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
      }`}
    >
      {/* Parallax Background Layer */}
      <div 
        ref={bgRef}
        className="absolute top-0 left-0 w-full min-h-full pointer-events-none z-0 overflow-hidden"
        style={{ willChange: 'transform' }}
      >
        <div className="absolute top-[-10%] right-[-10%] w-[600px] h-[600px] bg-gradient-to-br from-indigo-600/10 to-purple-600/10 rounded-full blur-[100px] opacity-60" />
        <div className="absolute top-[40%] left-[-10%] w-[500px] h-[500px] bg-gradient-to-tr from-amber-600/10 to-orange-500/10 rounded-full blur-[120px] opacity-50" />
        <div className="absolute bottom-[-10%] right-[10%] w-[400px] h-[400px] bg-blue-600/10 rounded-full blur-[80px] opacity-40" />
      </div>

      {/* Decorative Top Border (Sticky) */}
      <div className="sticky top-0 left-0 w-full h-1 bg-gradient-to-r from-amber-600 via-yellow-500 to-amber-600 z-30 mb-[-4px] shadow-[0_4px_12px_rgba(245,158,11,0.2)]"></div>
      
      {/* Content Wrapper */}
      <div className="relative z-10">
        <div className="flex flex-col mb-10 border-b border-indigo-900/30 pb-8 mt-2">
          <span className={`text-amber-500 text-xs font-bold tracking-[0.2em] uppercase mb-3 transform transition-all duration-1000 delay-300 ${isVisible ? 'translate-x-0 opacity-100' : '-translate-x-4 opacity-0'}`}>
            Academic Analysis
          </span>
          <h1 className={`text-3xl md:text-4xl font-extrabold text-white tracking-tight leading-tight transform transition-all duration-1000 delay-500 ${isVisible ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'}`}>
            {title}
          </h1>
        </div>
        
        <div className={`prose prose-invert max-w-none transform transition-all duration-1000 delay-700 ${isVisible ? 'opacity-100' : 'opacity-0'}`}>
          {formatText(explanation)}
        </div>

        <div className={`mt-8 pt-6 border-t border-indigo-900/30 transform transition-all duration-1000 delay-1000 ${isVisible ? 'translate-y-0 opacity-100' : 'translate-y-8 opacity-0'}`}>
          <h3 className="text-xl font-bold text-white mb-4 flex items-center">
            <span className="w-1 h-6 bg-amber-500 mr-3 rounded-full shadow-[0_0_8px_rgba(245,158,11,0.5)]"></span>
            Key Relationship Detail
          </h3>
          <p className="text-slate-300 italic leading-relaxed text-lg bg-[#0B1021] p-5 rounded-lg border border-indigo-900/20 shadow-inner">
            {relationshipDescription}
          </p>
        </div>
      </div>
    </div>
  );
};

export default ExplanationView;