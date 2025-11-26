import React, { useState, useEffect, useMemo } from 'react';
import { fetchAndParseCSV } from './services/csvService';
import { PartData, AppView, Word } from './types';
import { LoadingSpinner } from './components/LoadingSpinner';
import { PartCard } from './components/PartCard';
import { Flashcard } from './components/Flashcard';
import { Book, LayoutGrid, AlertTriangle, ArrowLeft, RefreshCw } from 'lucide-react';

const App: React.FC = () => {
  const [parts, setParts] = useState<PartData[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [view, setView] = useState<AppView>(AppView.HOME);
  
  // State for active session
  const [activeWords, setActiveWords] = useState<Word[]>([]);
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [sessionTitle, setSessionTitle] = useState<string>('');

  // Persistent State for "Hard" words (IDs)
  const [hardWordIds, setHardWordIds] = useState<Set<string>>(() => {
    const saved = localStorage.getItem('linguaFlowHardWords');
    return saved ? new Set(JSON.parse(saved)) : new Set();
  });

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    // Persist hard words whenever they change
    localStorage.setItem('linguaFlowHardWords', JSON.stringify(Array.from(hardWordIds)));
  }, [hardWordIds]);

  const loadData = async () => {
    setLoading(true);
    try {
      const data = await fetchAndParseCSV();
      setParts(data);
      setError(null);
    } catch (err) {
      setError("Veriler yüklenirken bir hata oluştu. Lütfen internet bağlantınızı kontrol edin.");
    } finally {
      setLoading(false);
    }
  };

  const toggleHardWord = (wordId: string) => {
    const newSet = new Set(hardWordIds);
    if (newSet.has(wordId)) {
      newSet.delete(wordId);
    } else {
      newSet.add(wordId);
    }
    setHardWordIds(newSet);
  };

  const startPart = (part: PartData) => {
    setActiveWords(part.words);
    setCurrentIndex(0);
    setSessionTitle(part.name);
    setView(AppView.STUDY);
  };

  const startDifficultMode = () => {
    // Collect all hard words from all parts
    const allWords = parts.flatMap(p => p.words);
    const hardWords = allWords.filter(w => hardWordIds.has(w.id));
    
    if (hardWords.length === 0) return;

    setActiveWords(hardWords);
    setCurrentIndex(0);
    setSessionTitle("Zorlandığım Kelimeler");
    setView(AppView.DIFFICULT);
  };

  const goHome = () => {
    setView(AppView.HOME);
    setActiveWords([]);
  };

  const handleNext = () => {
    if (currentIndex < activeWords.length - 1) {
      setCurrentIndex(prev => prev + 1);
    }
  };

  const handlePrev = () => {
    if (currentIndex > 0) {
      setCurrentIndex(prev => prev - 1);
    }
  };

  const totalHardWordsCount = useMemo(() => {
    return hardWordIds.size;
  }, [hardWordIds]);

  // RENDER HELPERS
  const renderHome = () => (
    <div className="max-w-6xl mx-auto px-4 py-6 md:py-8 animate-fade-in pb-20">
      <header className="mb-8 md:mb-12 text-center">
        <h1 className="text-3xl md:text-5xl font-black text-slate-800 mb-3 bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 to-purple-600">
          LinguaFlow
        </h1>
        <p className="text-sm md:text-lg text-slate-500 max-w-2xl mx-auto px-4">
          Kelime hazineni genişletmenin en modern yolu.
        </p>
      </header>

      {/* Stats Row - Horizontally scrollable on mobile */}
      <div className="flex overflow-x-auto pb-4 gap-4 snap-x px-1 -mx-4 md:mx-0 md:grid md:grid-cols-3 md:overflow-visible mb-8 no-scrollbar">
        {/* Card 1 */}
        <div className="min-w-[260px] md:min-w-0 snap-center bg-white p-5 rounded-2xl shadow-sm border border-slate-100 flex items-center space-x-4">
          <div className="p-3 bg-blue-100 text-blue-600 rounded-xl shrink-0">
            <Book size={24} />
          </div>
          <div>
            <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">Toplam Part</p>
            <p className="text-xl md:text-2xl font-bold text-slate-800">{parts.length}</p>
          </div>
        </div>

        {/* Card 2 */}
        <button 
          onClick={startDifficultMode}
          disabled={totalHardWordsCount === 0}
          className={`min-w-[260px] md:min-w-0 snap-center p-5 rounded-2xl shadow-sm border border-slate-100 flex items-center space-x-4 transition-all text-left ${totalHardWordsCount > 0 ? 'bg-white hover:bg-orange-50 hover:border-orange-200 cursor-pointer active:scale-95' : 'bg-slate-50 opacity-70 cursor-not-allowed'}`}
        >
          <div className={`p-3 rounded-xl shrink-0 ${totalHardWordsCount > 0 ? 'bg-orange-100 text-orange-600' : 'bg-slate-200 text-slate-400'}`}>
            <AlertTriangle size={24} />
          </div>
          <div>
            <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">Zorlandıklarım</p>
            <p className="text-xl md:text-2xl font-bold text-slate-800">{totalHardWordsCount} Kelime</p>
          </div>
        </button>

        {/* Card 3 */}
        <div className="min-w-[260px] md:min-w-0 snap-center bg-white p-5 rounded-2xl shadow-sm border border-slate-100 flex items-center space-x-4">
          <div className="p-3 bg-green-100 text-green-600 rounded-xl shrink-0">
            <LayoutGrid size={24} />
          </div>
          <div>
            <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">Toplam Kelime</p>
            <p className="text-xl md:text-2xl font-bold text-slate-800">
              {parts.reduce((acc, part) => acc + part.words.length, 0)}
            </p>
          </div>
        </div>
      </div>

      <div className="flex items-center space-x-2 mb-4 text-slate-800 font-bold text-lg md:text-xl px-1">
        <LayoutGrid size={20} className="text-indigo-600" />
        <span>Part Listesi</span>
      </div>

      {loading ? (
        <LoadingSpinner />
      ) : error ? (
        <div className="text-center py-10 bg-red-50 rounded-2xl border border-red-100 mx-4">
          <p className="text-red-600 font-medium mb-4 px-4">{error}</p>
          <button onClick={loadData} className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors flex items-center mx-auto">
            <RefreshCw size={16} className="mr-2" /> Yeniden Dene
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
          {parts.map((part) => (
            <PartCard 
              key={part.name} 
              part={part} 
              wordCount={part.words.length}
              onClick={() => startPart(part)} 
            />
          ))}
        </div>
      )}
    </div>
  );

  const renderStudy = () => (
    <div className="fixed inset-0 flex flex-col bg-slate-50 h-[100dvh]">
      {/* Top Bar - Compact */}
      <div className="px-4 py-3 bg-white border-b border-slate-100 flex items-center justify-between shadow-sm z-20 shrink-0">
        <button 
          onClick={goHome}
          className="p-2 -ml-2 rounded-full hover:bg-slate-100 text-slate-600 active:scale-90 transition-transform"
        >
          <ArrowLeft size={22} />
        </button>
        
        <div className="text-center">
          <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wide truncate max-w-[180px]">{sessionTitle}</h2>
          <p className="text-xs text-slate-400 font-medium">
            {currentIndex + 1} / {activeWords.length}
          </p>
        </div>
        
        <div className="w-10"></div> {/* Spacer */}
      </div>

      {/* Progress Bar */}
      <div className="h-1 bg-slate-200 w-full shrink-0">
        <div 
          className="h-full bg-indigo-600 transition-all duration-300 ease-out"
          style={{ width: `${((currentIndex + 1) / activeWords.length) * 100}%` }}
        />
      </div>

      {/* Main Content Area */}
      <div className="flex-1 w-full max-w-lg mx-auto p-4 md:p-6 flex flex-col min-h-0">
        {activeWords.length > 0 ? (
          <Flashcard 
            word={activeWords[currentIndex]}
            total={activeWords.length}
            current={currentIndex}
            onNext={handleNext}
            onPrev={handlePrev}
            onToggleHard={toggleHardWord}
            isHard={hardWordIds.has(activeWords[currentIndex].id)}
          />
        ) : (
          <div className="flex-1 flex items-center justify-center text-slate-500">
            <p>Bu listede hiç kelime yok.</p>
          </div>
        )}
      </div>
    </div>
  );

  return (
    <div className="bg-[#f8fafc] text-slate-800 font-sans min-h-screen">
      {view === AppView.HOME ? renderHome() : renderStudy()}
    </div>
  );
};

export default App;