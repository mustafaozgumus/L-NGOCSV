import React from 'react';
import { PartData } from '../types';
import { BookOpen, ChevronRight } from 'lucide-react';

interface PartCardProps {
  part: PartData;
  onClick: () => void;
  wordCount: number;
}

export const PartCard: React.FC<PartCardProps> = ({ part, onClick, wordCount }) => {
  return (
    <button
      onClick={onClick}
      className="group relative flex flex-col items-start p-5 bg-white rounded-2xl shadow-sm hover:shadow-lg active:scale-95 active:shadow-sm transition-all duration-200 border border-slate-100 w-full text-left overflow-hidden touch-manipulation"
    >
      <div className="absolute top-0 right-0 w-20 h-20 bg-indigo-50 rounded-bl-full -mr-4 -mt-4 transition-transform group-hover:scale-110"></div>
      
      <div className="flex items-center space-x-3 mb-3 z-10">
        <div className="p-2 bg-indigo-100 text-indigo-600 rounded-lg group-hover:bg-indigo-600 group-hover:text-white transition-colors duration-300">
          <BookOpen size={20} />
        </div>
        <h3 className="text-lg font-bold text-slate-800 uppercase tracking-wide">{part.name}</h3>
      </div>
      
      <p className="text-slate-500 text-sm font-medium z-10 mb-3">{wordCount} Kelime</p>
      
      <div className="mt-auto flex items-center text-sm font-bold text-indigo-600 group-hover:translate-x-1 transition-transform z-10">
        Başla <ChevronRight size={16} className="ml-1" />
      </div>
    </button>
  );
};