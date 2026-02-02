
import React, { useState, useEffect } from 'react';
import { UserProfile, ChatSession, Message, LibraryItem, LearningPath } from './types.ts';
import Layout from './components/Layout.tsx';
import ChatInterface from './components/ChatInterface.tsx';
import Library from './components/Library.tsx';
import History from './components/History.tsx';
import ProfileSetup from './components/ProfileSetup.tsx';
import LearningPaths from './components/LearningPaths.tsx';
import { BookOpen, AlertCircle, Share2, Check, Key, ExternalLink } from 'lucide-react';
import { geminiService } from './services/geminiService.ts';
import { storage } from './services/storageService.ts';

const App: React.FC = () => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [activeView, setActiveView] = useState<'chat' | 'history' | 'library' | 'profile' | 'paths'>('chat');
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [libraryItems, setLibraryItems] = useState<LibraryItem[]>([]);
  const [learningPaths, setLearningPaths] = useState<LearningPath[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [copySuccess, setCopySuccess] = useState(false);
  const [keyError, setKeyError] = useState(false);

  useEffect(() => {
    const initData = async () => {
      const savedUser = localStorage.getItem('tutoria_user');
      if (savedUser) {
        setUser(JSON.parse(savedUser));
        setIsLoggedIn(true);
      }
      
      const [dbSessions, dbLibrary, dbPaths] = await Promise.all([
        storage.getAll('sessions'),
        storage.getAll('library'),
        storage.getAll('paths')
      ]);

      setSessions(dbSessions);
      setLibraryItems(dbLibrary);
      setLearningPaths(dbPaths);
    };
    initData();
  }, []);

  const handleOpenKeySelector = async () => {
    if (window.aistudio?.openSelectKey) {
      await window.aistudio.openSelectKey();
      setKeyError(false);
      // Tras abrir el selector, asumimos éxito y recargamos
      window.location.reload();
    } else {
      alert("Esta función solo está disponible en el entorno de AI Studio/Netlify.");
    }
  };

  const handleSendMessage = async (msg: Message) => {
    if (!user) return;

    let currentSessionId = activeSessionId;
    let currentSession: ChatSession;

    if (!currentSessionId) {
      currentSessionId = Date.now().toString();
      currentSession = {
        id: currentSessionId,
        title: msg.content.substring(0, 30) || 'Consulta de Lengua',
        messages: [msg],
        updatedAt: Date.now(),
        userId: user.id
      };
      setSessions(prev => [currentSession, ...prev]);
      setActiveSessionId(currentSessionId);
    } else {
      currentSession = sessions.find(s => s.id === currentSessionId)!;
      currentSession.messages.push(msg);
      currentSession.updatedAt = Date.now();
      setSessions([...sessions]);
    }

    if (msg.attachments && msg.attachments.length > 0) {
      for (const att of msg.attachments) {
        const item: LibraryItem = {
          id: att.id,
          name: att.name,
          type: att.mimeType,
          url: att.url,
          uploadedAt: Date.now(),
          userId: user.id
        };
        await storage.save('library', item);
        setLibraryItems(prev => {
          if (prev.some(p => p.url === item.url)) return prev;
          return [item, ...prev];
        });
      }
    }

    await storage.save('sessions', currentSession);

    setIsProcessing(true);
    setKeyError(false);
    
    try {
      const aiResponse = await geminiService.sendMessage(
        user,
        currentSession.messages.slice(0, -1),
        msg.content,
        msg.attachments
      );

      const aiMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: 'model',
        content: aiResponse,
        timestamp: Date.now()
      };

      currentSession.messages.push(aiMsg);
      setSessions([...sessions]);
      await storage.save('sessions', currentSession);
    } catch (error: any) {
      console.error(error);
      if (error.message === 'API_KEY_INVALID') {
        setKeyError(true);
      }
    } finally {
      setIsProcessing(false);
    }
  };

  const handleLogout = () => {
    if (confirm("Al cerrar sesión, se mantendrán tus datos en este navegador.")) {
      setIsLoggedIn(false);
    }
  };

  if (!isLoggedIn) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6">
        <div className="max-w-4xl w-full grid md:grid-cols-2 bg-white rounded-3xl shadow-2xl overflow-hidden border border-slate-200">
          <div className="bg-indigo-600 p-12 text-white flex flex-col justify-center">
            <div className="bg-white/20 p-4 rounded-2xl w-fit mb-8 backdrop-blur-md">
              <BookOpen size={48} />
            </div>
            <h1 className="text-4xl font-black mb-4 leading-tight tracking-tight">TutorIA</h1>
            <p className="text-indigo-100 text-lg opacity-90 font-medium">Tu compañero inteligente para Lengua y Literatura.</p>
          </div>
          <div className="p-12 flex flex-col justify-center space-y-8">
            <div className="text-center md:text-left">
              <h2 className="text-3xl font-bold text-slate-800 mb-2">¡Bienvenido!</h2>
              <p className="text-slate-500">Accede a tu tutor personal de forma gratuita y local.</p>
            </div>
            <button 
              onClick={() => setIsLoggedIn(true)} 
              className="w-full bg-indigo-600 text-white font-bold py-4 rounded-xl hover:bg-indigo-700 shadow-lg transition-all"
            >
              Comenzar ahora
            </button>
            <div className="flex items-start gap-2 text-xs text-slate-400 bg-slate-50 p-3 rounded-lg border border-slate-100">
              <AlertCircle size={14} className="shrink-0 mt-0.5 text-indigo-400" />
              <p>Tus datos se guardan exclusivamente en tu navegador.</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!user) return <ProfileSetup onComplete={(data) => {
    const newUser: UserProfile = { ...data, id: Date.now().toString(), email: 'user@tutoria.local' };
    setUser(newUser);
    localStorage.setItem('tutoria_user', JSON.stringify(newUser));
    setIsLoggedIn(true);
  }} />;

  const activeSession = sessions.find(s => s.id === activeSessionId);

  return (
    <Layout activeView={activeView} setActiveView={setActiveView} user={user} onLogout={handleLogout}>
      {keyError && (
        <div className="bg-red-50 border-b border-red-100 p-4 flex flex-col md:flex-row items-center justify-between gap-4 animate-in slide-in-from-top duration-300">
          <div className="flex items-center gap-3">
            <AlertCircle className="text-red-500" size={24} />
            <div className="text-sm text-red-800">
              <p className="font-bold">Error de API Key</p>
              <p>La clave configurada no es válida. Debes seleccionar una clave de un proyecto con facturación activa.</p>
            </div>
          </div>
          <div className="flex gap-3">
            <a 
              href="https://ai.google.dev/gemini-api/docs/billing" 
              target="_blank" 
              className="px-4 py-2 text-xs font-bold text-red-600 flex items-center gap-1 hover:underline"
            >
              Documentación <ExternalLink size={14} />
            </a>
            <button 
              onClick={handleOpenKeySelector}
              className="bg-red-600 text-white px-6 py-2 rounded-lg text-xs font-bold flex items-center gap-2 hover:bg-red-700"
            >
              <Key size={14} /> Configurar API Key
            </button>
          </div>
        </div>
      )}

      {activeView === 'chat' && (
        <ChatInterface 
          user={user} 
          currentChat={activeSession?.messages || []} 
          onSendMessage={handleSendMessage} 
          isProcessing={isProcessing} 
        />
      )}
      {activeView === 'paths' && (
        <LearningPaths 
          user={user} 
          paths={learningPaths} 
          onAddPath={(p) => { storage.save('paths', p); setLearningPaths(prev => [p as LearningPath, ...prev]); }} 
          onUpdatePath={(p) => { storage.save('paths', p); setLearningPaths(prev => prev.map(old => old.id === p.id ? p : old)); }} 
        />
      )}
      {activeView === 'history' && (
        <History 
          sessions={sessions} 
          onSelectSession={(id) => { setActiveSessionId(id); setActiveView('chat'); }} 
          onDeleteSession={async (id) => {
            if (confirm("¿Borrar historial?")) {
              await storage.delete('sessions', id);
              setSessions(prev => prev.filter(s => s.id !== id));
              if (activeSessionId === id) setActiveSessionId(null);
            }
          }} 
        />
      )}
      {activeView === 'library' && (
        <Library 
          items={libraryItems} 
          onDeleteItem={async (id) => {
            if (confirm("¿Borrar de la biblioteca?")) {
              await storage.delete('library', id);
              setLibraryItems(prev => prev.filter(i => i.id !== id));
            }
          }} 
          onUseInChat={(item) => {
            setActiveSessionId(null);
            setActiveView('chat');
            handleSendMessage({
              id: Date.now().toString(),
              role: 'user',
              content: `Analicemos este archivo: ${item.name}`,
              timestamp: Date.now(),
              attachments: [{ id: item.id, name: item.name, type: 'file', url: item.url, mimeType: item.type }]
            });
          }}
        />
      )}
      {activeView === 'profile' && (
        <div className="p-10 max-w-2xl mx-auto w-full">
           <h1 className="text-4xl font-black mb-10 text-slate-800">Mi Perfil</h1>
           <div className="bg-white rounded-3xl p-10 border border-slate-200 shadow-sm space-y-10">
              <div className="flex items-center gap-6">
                <div className="w-20 h-20 bg-indigo-600 text-white rounded-2xl flex items-center justify-center text-3xl font-black">
                  {user.name[0]}
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-slate-800">{user.name}</h2>
                  <p className="text-slate-500">{user.grade}</p>
                </div>
              </div>

              <div className="pt-8 border-t border-slate-100">
                <button 
                  onClick={handleOpenKeySelector}
                  className="w-full py-4 bg-slate-50 text-slate-600 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-slate-100 border border-slate-200"
                >
                  <Key size={18} /> Cambiar API Key de Google
                </button>
              </div>

              <button 
                onClick={() => { if(confirm("¿Borrar todo?")) { localStorage.clear(); indexedDB.deleteDatabase('TutorIA_DB'); window.location.reload(); } }}
                className="w-full py-4 text-slate-400 hover:text-red-500 font-bold"
              >
                Borrar todos mis datos locales
              </button>
           </div>
        </div>
      )}
    </Layout>
  );
};

export default App;
