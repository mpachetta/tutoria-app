
import React from 'react';
import { 
  MessageSquare, 
  ChevronRight, 
  Calendar,
  Clock,
  Trash2,
  Search
} from 'lucide-react';
import { ChatSession } from '../types';

interface HistoryProps {
  sessions: ChatSession[];
  onSelectSession: (id: string) => void;
  onDeleteSession: (id: string) => void;
}

const History: React.FC<HistoryProps> = ({ sessions, onSelectSession, onDeleteSession }) => {
  const [searchTerm, setSearchTerm] = React.useState('');

  const sortedSessions = [...sessions].sort((a, b) => b.updatedAt - a.updatedAt);
  const filteredSessions = sortedSessions.filter(s => 
    s.title.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="p-4 md:p-8 flex flex-col h-full">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-800 mb-2">Historial de Consultas</h1>
        <p className="text-slate-500">Revisa tus conversaciones anteriores con TutorIA.</p>
      </div>

      <div className="relative mb-6">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
        <input 
          type="text"
          placeholder="Buscar en el historial..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-10 pr-4 py-3 bg-white border border-slate-200 rounded-xl shadow-sm focus:ring-2 focus:ring-indigo-500 outline-none"
        />
      </div>

      <div className="flex-1 overflow-y-auto space-y-4 pr-2">
        {filteredSessions.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-3xl border-2 border-dashed border-slate-200">
            <MessageSquare className="mx-auto text-slate-200 mb-4" size={48} />
            <p className="text-slate-500 font-medium">No se encontraron conversaciones.</p>
          </div>
        ) : (
          filteredSessions.map((session) => (
            <div 
              key={session.id}
              className="group bg-white border border-slate-200 rounded-2xl p-5 hover:border-indigo-300 hover:shadow-lg transition-all cursor-pointer relative"
              onClick={() => onSelectSession(session.id)}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg">
                      <MessageSquare size={18} />
                    </div>
                    <h3 className="font-bold text-slate-800 truncate text-lg">{session.title}</h3>
                  </div>
                  
                  <div className="flex flex-wrap items-center gap-4 mt-3">
                    <div className="flex items-center gap-1.5 text-xs text-slate-500">
                      <Calendar size={14} />
                      <span>{new Date(session.updatedAt).toLocaleDateString()}</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-xs text-slate-500">
                      <Clock size={14} />
                      <span>{new Date(session.updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                    <div className="px-2 py-0.5 bg-slate-100 text-slate-600 rounded text-[10px] font-bold uppercase tracking-wide">
                      {session.messages.length} mensajes
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      onDeleteSession(session.id);
                    }}
                    className="p-2 text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all"
                  >
                    <Trash2 size={20} />
                  </button>
                  <ChevronRight className="text-slate-300 group-hover:text-indigo-500 transition-colors" />
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default History;
