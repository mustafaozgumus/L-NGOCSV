import React, { useState, useEffect, useRef } from 'react';
import { Word } from '../types';
import { generateWordContext, validateUserSentence } from '../services/geminiService';
import { Volume2, Sparkles, AlertCircle, ChevronLeft, ChevronRight, PenTool, Check, RefreshCw, X } from 'lucide-react';

interface FlashcardProps {
  word: Word;
  onNext: () => void;
  onPrev: () => void;
  onToggleHard: (wordId: string) => void;
  isHard: boolean;
  total: number;
  current: number;
}

export const Flashcard: React.FC<FlashcardProps> = ({ 
  word, 
  onNext, 
  onPrev, 
  onToggleHard, 
  isHard,
  total,
  current
}) => {
  const [isFlipped, setIsFlipped] = useState(false);
  const [aiContext, setAiContext] = useState<{ sentence: string; translation: string; definition: string } | null>(null);
  const [isLoadingAi, setIsLoadingAi] = useState(false);

  // Sentence Practice State
  const [showPractice, setShowPractice] = useState(false);
  const [userSentence, setUserSentence] = useState('');
  const [isCheckingSentence, setIsCheckingSentence] = useState(false);
  const [sentenceFeedback, setSentenceFeedback] = useState<{ isCorrect: boolean; feedback: string; correction?: string } | null>(null);

  // Swipe State
  const [dragPos, setDragPos] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [exitDirection, setExitDirection] = useState<'left' | 'right' | null>(null);
  
  const touchStart = useRef<{ x: number, y: number } | null>(null);
  const dragLocked = useRef<'horizontal' | 'vertical' | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Reset state when word changes
  useEffect(() => {
    setIsFlipped(false);
    setAiContext(null);
    setIsLoadingAi(false);
    setDragPos({ x: 0, y: 0 });
    setExitDirection(null);
    setIsDragging(false);
    dragLocked.current = null;
    setShowPractice(false);
    setUserSentence('');
    setSentenceFeedback(null);
    setIsCheckingSentence(false);
  }, [word]);

  // Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger shortcuts if typing in input
      if ((e.target as HTMLElement).tagName === 'INPUT' || (e.target as HTMLElement).tagName === 'TEXTAREA') return;

      if (e.code === 'Space') {
        e.preventDefault();
        setIsFlipped(prev => !prev);
      } else if (e.code === 'ArrowLeft') {
        handleSwipeLeft();
      } else if (e.code === 'ArrowRight') {
        handleSwipeRight();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [current, total, isHard, word.id]); // Dependencies for closure values

  const handleSpeak = (e: React.MouseEvent | React.TouchEvent, text: string, lang: 'en-US' | 'tr-TR') => {
    e.stopPropagation();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = lang;
    window.speechSynthesis.speak(utterance);
  };

  const handleAskAI = async (e: React.MouseEvent | React.TouchEvent) => {
    e.stopPropagation();
    if (aiContext) return; 

    setIsLoadingAi(true);
    try {
      const result = await generateWordContext(word);
      setAiContext(result);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoadingAi(false);
    }
  };

  const handleCheckSentence = async (e?: React.MouseEvent) => {
    if(e) e.stopPropagation();
    if (!userSentence.trim()) return;
    setIsCheckingSentence(true);
    try {
      const result = await validateUserSentence(word.english, userSentence);
      setSentenceFeedback(result);
    } catch (err) {
      console.error(err);
    } finally {
      setIsCheckingSentence(false);
    }
  };

  // --- TOUCH HANDLERS ---

  const onTouchStart = (e: React.TouchEvent) => {
    // If asking AI or speaking or interacting with input, don't start drag
    if ((e.target as HTMLElement).closest('button, input, textarea')) return;
    
    touchStart.current = {
      x: e.touches[0].clientX,
      y: e.touches[0].clientY
    };
    dragLocked.current = null;
    setIsDragging(true);
  };

  const onTouchMove = (e: React.TouchEvent) => {
    if (!touchStart.current || !isDragging) return;

    const dx = e.touches[0].clientX - touchStart.current.x;
    const dy = e.touches[0].clientY - touchStart.current.y;

    // Determine direction on first significant move
    if (!dragLocked.current) {
      if (Math.abs(dx) > 10 && Math.abs(dx) > Math.abs(dy)) {
        dragLocked.current = 'horizontal';
      } else if (Math.abs(dy) > 10) {
        dragLocked.current = 'vertical';
      }
    }

    // Only move card if locked horizontally
    if (dragLocked.current === 'horizontal') {
      if (e.cancelable) e.preventDefault(); // Prevent scrolling while swiping
      setDragPos({ x: dx, y: 0 });
    }
  };

  const onTouchEnd = () => {
    if (!isDragging) return;
    setIsDragging(false);

    const threshold = 100; // px to trigger swipe action

    if (dragLocked.current === 'horizontal') {
      if (dragPos.x > threshold) {
        // Swipe Right -> "Bildim" (Know it)
        handleSwipeRight();
      } else if (dragPos.x < -threshold) {
        // Swipe Left -> "Zorlandım" (Hard)
        handleSwipeLeft();
      } else {
        // Snap back
        setDragPos({ x: 0, y: 0 });
      }
    } else {
       setDragPos({ x: 0, y: 0 });
    }
    
    touchStart.current = null;
    dragLocked.current = null;
  };

  const handleSwipeRight = () => {
    if (current === total - 1) {
       setDragPos({ x: 0, y: 0 });
       if (isHard) onToggleHard(word.id); // Allow updating state even on last card
       return;
    }

    setExitDirection('right');
    // Animate out then trigger logic
    setTimeout(() => {
      // If it was marked hard, unmark it (because user said "Bildim")
      if (isHard) onToggleHard(word.id);
      onNext();
    }, 200);
  };

  const handleSwipeLeft = () => {
    if (current === total - 1) {
       if (!isHard) onToggleHard(word.id);
       setDragPos({ x: 0, y: 0 });
       return;
    }

    setExitDirection('left');
    setTimeout(() => {
      // If NOT marked hard, mark it (because user said "Zorlandım")
      if (!isHard) onToggleHard(word.id);
      onNext();
    }, 200);
  };

  // --- STYLES ---

  // Rotation based on X position
  const rotation = dragPos.x * 0.05;
  const opacity = Math.max(0, 1 - Math.abs(dragPos.x) / 500);
  
  // Transition logic
  const transitionClass = isDragging ? 'transition-none' : 'transition-all duration-300 ease-out';
  
  // Exit animation transform
  let transformStyle = {};
  if (exitDirection === 'right') {
    transformStyle = { transform: 'translate(120vw, 0) rotate(20deg)', opacity: 0 };
  } else if (exitDirection === 'left') {
    transformStyle = { transform: 'translate(-120vw, 0) rotate(-20deg)', opacity: 0 };
  } else {
    transformStyle = { transform: `translate(${dragPos.x}px, ${dragPos.y}px) rotate(${rotation}deg)`, opacity };
  }

  // Overlay Opacity
  const rightSwipeOpacity = Math.min(1, Math.max(0, dragPos.x) / 100);
  const leftSwipeOpacity = Math.min(1, Math.max(0, -dragPos.x) / 100);

  return (
    <div className="flex flex-col h-full w-full">
      {/* Card Container */}
      <div className="flex-1 relative perspective-1000 min-h-0 mb-6 flex items-center justify-center">
        
        {/* Swipe Wrapper */}
        <div 
          ref={containerRef}
          className={`relative w-full h-full max-h-[600px] cursor-grab active:cursor-grabbing ${transitionClass}`}
          style={transformStyle}
          onTouchStart={onTouchStart}
          onTouchMove={onTouchMove}
          onTouchEnd={onTouchEnd}
        >
          {/* Swipe Indicators */}
          <div 
            className="absolute top-8 right-8 z-50 border-4 border-orange-500 rounded-lg px-4 py-2 text-orange-500 font-bold text-2xl uppercase tracking-widest transform rotate-12 pointer-events-none bg-white/10 backdrop-blur-sm"
            style={{ opacity: leftSwipeOpacity }}
          >
            Zorlandım
          </div>

           <div 
            className="absolute top-8 left-8 z-50 border-4 border-green-500 rounded-lg px-4 py-2 text-green-500 font-bold text-2xl uppercase tracking-widest transform -rotate-12 pointer-events-none bg-white/10 backdrop-blur-sm"
            style={{ opacity: rightSwipeOpacity }}
          >
            Bildim
          </div>

          <div 
            className={`relative w-full h-full text-center transition-transform duration-500 transform-style-3d ${isFlipped ? 'rotate-y-180' : ''}`}
            onClick={() => {
              // Only flip if not dragging and not selecting text in textarea
              const selection = window.getSelection();
              if (!isDragging && (!selection || selection.toString().length === 0)) {
                // Also check if we are clicking inside the sentence practice area when it is open - don't flip
                setIsFlipped(!isFlipped)
              }
            }}
          >
            {/* Front Face (English) */}
            <div className="absolute inset-0 backface-hidden rounded-3xl bg-white shadow-xl border border-slate-200 flex flex-col justify-center items-center p-6 md:p-8">
              {/* Fix for ghost icon: Wrap content and fade out when flipped */}
              <div className={`w-full h-full flex flex-col justify-center items-center transition-opacity duration-200 ${isFlipped ? 'opacity-0 pointer-events-none' : 'opacity-100 delay-100'}`}>
                <div className="absolute top-6 left-0 right-0 text-center">
                  <span className="text-xs font-bold text-indigo-400 tracking-[0.2em] uppercase">İngilizce</span>
                </div>

                <div className="flex flex-col items-center justify-center w-full flex-1">
                  <h2 className="text-4xl md:text-5xl lg:text-6xl font-black text-slate-800 mb-8 break-words max-w-full leading-tight select-none">
                    {word.english}
                  </h2>
                  <button 
                    onClick={(e) => handleSpeak(e, word.english, 'en-US')}
                    className="p-4 rounded-full bg-indigo-50 text-indigo-600 hover:bg-indigo-100 active:bg-indigo-200 transition-colors shadow-sm z-10"
                  >
                    <Volume2 size={32} />
                  </button>
                </div>

                <div className="absolute bottom-8 text-slate-400 text-sm font-medium animate-pulse select-none hidden md:block">
                  Çevirmek için boşluk tuşuna bas
                </div>
                <div className="absolute bottom-8 text-slate-400 text-sm font-medium animate-pulse select-none md:hidden">
                  Çevirmek için dokun
                </div>
              </div>
            </div>

            {/* Back Face (Turkish + AI) */}
            <div 
              className="absolute inset-0 backface-hidden rotate-y-180 rounded-3xl bg-slate-800 shadow-xl text-white flex flex-col p-6 overflow-hidden"
              // Removed onClick stopPropagation to allow flipping back by touching empty space
            >
              {/* Header with Close Flip */}
              <div 
                className="text-center shrink-0 mb-4 cursor-pointer"
                onClick={() => setIsFlipped(false)}
              >
                 <span className="text-xs font-bold text-slate-400 tracking-[0.2em] uppercase">Türkçe</span>
              </div>

              {/* Main Turkish Word */}
              <div className="flex flex-col items-center shrink-0 mb-4 border-b border-slate-700 pb-4">
                <h2 className="text-3xl md:text-4xl font-bold mb-3 select-none">{word.turkish}</h2>
                <button 
                  onClick={(e) => handleSpeak(e, word.turkish, 'tr-TR')}
                  className="p-2 rounded-full bg-slate-700 hover:bg-slate-600 active:bg-slate-500 transition-colors z-10"
                >
                  <Volume2 size={20} />
                </button>
              </div>

              {/* Scrollable Content Area */}
              <div 
                className="flex-1 overflow-y-auto -mx-2 px-2 custom-scrollbar relative space-y-4"
                onTouchStart={(e) => e.stopPropagation()} 
              >
                {/* AI Analysis Section */}
                {!aiContext && !isLoadingAi ? (
                   <button
                   onClick={handleAskAI}
                   className="flex items-center space-x-2 bg-indigo-600/90 text-white px-4 py-3 rounded-xl font-bold hover:bg-indigo-500 active:scale-95 transition-all shadow-lg w-full justify-center text-sm"
                 >
                   <Sparkles size={18} />
                   <span>Analiz & Örnek Cümle</span>
                 </button>
                ) : null}

                {isLoadingAi && (
                  <div className="flex flex-col items-center justify-center py-4">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-indigo-400 mb-2"></div>
                    <p className="text-slate-400 text-xs">Gemini düşünüyor...</p>
                  </div>
                )}

                {aiContext && (
                   <div className="text-left space-y-3 animate-fade-in">
                      <div className="bg-slate-700/50 p-3 rounded-xl border border-slate-700">
                        <span className="block text-[10px] uppercase tracking-wider text-indigo-400 mb-1">Tanım</span>
                        <p className="font-medium text-slate-200 text-sm leading-relaxed">{aiContext.definition}</p>
                      </div>
                      <div className="bg-slate-700/50 p-3 rounded-xl border border-slate-700">
                        <span className="block text-[10px] uppercase tracking-wider text-indigo-400 mb-1">Örnek</span>
                        <p className="italic text-base text-white mb-1">"{aiContext.sentence}"</p>
                        <p className="text-slate-400 text-xs">{aiContext.translation}</p>
                        <button 
                           onClick={(e) => handleSpeak(e, aiContext.sentence, 'en-US')}
                           className="mt-2 text-indigo-300 hover:text-white flex items-center text-xs"
                        >
                          <Volume2 size={14} className="mr-1" /> Dinle
                        </button>
                      </div>
                   </div>
                )}

                {/* Sentence Practice Section */}
                <div className="border-t border-slate-700 pt-4">
                   {!showPractice ? (
                     <button
                       onClick={(e) => { e.stopPropagation(); setShowPractice(true); }}
                       className="flex items-center justify-center space-x-2 w-full py-3 rounded-xl border border-slate-600 hover:bg-slate-700 transition-colors text-slate-300 text-sm font-medium"
                     >
                        <PenTool size={16} />
                        <span>Kendi Cümleni Kur</span>
                     </button>
                   ) : (
                     <div 
                      className="space-y-3 animate-fade-in bg-slate-900/50 p-3 rounded-xl"
                      onClick={(e) => e.stopPropagation()} // Prevent closing/flipping when tapping inside practice area
                     >
                        <div className="flex justify-between items-center mb-1">
                          <label className="text-xs text-slate-400 font-medium">Senin Cümlen:</label>
                          <button onClick={() => setShowPractice(false)} className="text-slate-500 hover:text-white"><X size={14}/></button>
                        </div>
                        <textarea
                          value={userSentence}
                          onClick={(e) => e.stopPropagation()}
                          onChange={(e) => setUserSentence(e.target.value)}
                          placeholder={`"${word.english}" kelimesini kullanarak bir cümle yaz...`}
                          className="w-full bg-slate-800 border border-slate-600 rounded-lg p-3 text-white text-sm focus:ring-2 focus:ring-indigo-500 outline-none resize-none h-20 placeholder:text-slate-600"
                        />
                        
                        {!sentenceFeedback ? (
                          <button
                            onClick={handleCheckSentence}
                            disabled={!userSentence.trim() || isCheckingSentence}
                            className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white py-2 rounded-lg text-sm font-bold flex items-center justify-center"
                          >
                            {isCheckingSentence ? <RefreshCw className="animate-spin mr-2" size={16}/> : <Check className="mr-2" size={16}/>}
                            {isCheckingSentence ? 'Kontrol Ediliyor...' : 'Kontrol Et'}
                          </button>
                        ) : (
                          <div className={`p-3 rounded-lg border text-sm ${sentenceFeedback.isCorrect ? 'bg-green-900/30 border-green-800 text-green-200' : 'bg-red-900/30 border-red-800 text-red-200'}`}>
                             <div className="font-bold flex items-center mb-1">
                               {sentenceFeedback.isCorrect ? <Check size={16} className="mr-1"/> : <AlertCircle size={16} className="mr-1"/>}
                               {sentenceFeedback.isCorrect ? 'Harika!' : 'Dikkat'}
                             </div>
                             <p className="mb-2 text-xs opacity-90">{sentenceFeedback.feedback}</p>
                             {sentenceFeedback.correction && (
                               <div className="bg-black/20 p-2 rounded text-xs mt-2">
                                  <span className="block opacity-50 mb-0.5">Doğrusu:</span>
                                  {sentenceFeedback.correction}
                               </div>
                             )}
                             <button 
                              onClick={(e) => { e.stopPropagation(); setSentenceFeedback(null); setUserSentence(''); }}
                              className="mt-3 text-xs underline opacity-60 hover:opacity-100"
                             >
                               Yeni Cümle Dene
                             </button>
                          </div>
                        )}
                     </div>
                   )}
                </div>

                <div className="h-10"></div> {/* Bottom Spacer */}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Controls - Fixed at bottom of flex container */}
      <div className="flex items-center justify-between gap-4 shrink-0 pb-2 md:pb-0 z-10">
        <button 
          onClick={onPrev}
          className="h-14 w-14 flex items-center justify-center bg-white text-slate-700 rounded-2xl shadow-md border border-slate-100 hover:bg-slate-50 active:scale-90 transition-all disabled:opacity-30 disabled:active:scale-100 hidden md:flex"
          disabled={current === 0}
        >
          <ChevronLeft size={28} />
        </button>
        
        {/* Helper Text / Status for Desktop/Mobile */}
        <div className="flex-1 flex justify-center text-xs text-slate-400 font-medium space-x-6">
           <span className="flex items-center hidden md:flex"><kbd className="bg-slate-100 px-1 rounded mr-1">←</kbd> Zorlandım</span>
           <span className="flex items-center md:hidden"><ChevronLeft size={14} className="mr-1"/> Sola Kaydır: Zorlandım</span>
           
           <span className="flex items-center hidden md:flex">Bildim <kbd className="bg-slate-100 px-1 rounded ml-1">→</kbd></span>
           <span className="flex items-center md:hidden">Sağa Kaydır: Bildim <ChevronRight size={14} className="ml-1"/></span>
        </div>

        <button 
          onClick={(e) => {
            onToggleHard(word.id);
          }}
          className={`h-14 px-4 rounded-2xl font-bold shadow-md transition-all active:scale-95 flex items-center justify-center space-x-2 ${
            isHard 
              ? 'bg-orange-100 text-orange-600 border border-orange-200' 
              : 'bg-white text-slate-600 border border-slate-100 hover:bg-slate-50'
          }`}
        >
          <AlertCircle size={22} className={isHard ? "fill-current" : ""} />
        </button>

        <button 
          onClick={onNext}
          className="h-14 w-14 flex items-center justify-center bg-indigo-600 text-white rounded-2xl shadow-md shadow-indigo-200 hover:bg-indigo-700 active:scale-90 transition-all disabled:opacity-50 disabled:active:scale-100 hidden md:flex"
          disabled={current === total - 1}
        >
          <ChevronRight size={28} />
        </button>
      </div>
    </div>
  );
};