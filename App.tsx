
import React, { useState, useEffect } from 'react';
import { UserProfile, ChatSession, Message, LibraryItem, LearningPath, Attachment } from './types';
import Layout from './components/Layout';
import ChatInterface from './components/ChatInterface';
import Library from './components/Library';
import History from './components/History';
import ProfileSetup from './components/ProfileSetup';
import LearningPaths from './components/LearningPaths';
import { BookOpen, AlertCircle, Share2, Check } from 'lucide-react';
import { geminiService } from './services/geminiService';
import { storage } from './services/storageService';

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

  const handleProfileComplete = (profileData: Omit<UserProfile, 'id' | 'email'>) => {
    const newUser: UserProfile = {
      ...profileData,
      id: Date.now().toString(),
      email: 'estudiante@tutoria.local'
    };
    setUser(newUser);
    localStorage.setItem('tutoria_user', JSON.stringify(newUser));
    setIsLoggedIn(true);
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
    } catch (error) {
      console.error(error);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleShareApp = async () => {
    const shareData = {
      title: 'TutorIA - Tu Profe de Lengua',
      text: '¡Mira esta app! Me ayuda un montón con mis tareas de Lengua y Literatura. Es gratis.',
      url: window.location.href
    };

    if (navigator.share) {
      try {
        await navigator.share(shareData);
      } catch (err) {
        console.log('Error sharing', err);
      }
    } else {
      navigator.clipboard.writeText(window.location.href);
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    }
  };

  const handleLogout = () => {
    if (confirm("Al cerrar sesión, se mantendrán tus datos en este navegador para la próxima vez.")) {
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
            <p className="text-indigo-100 text-lg opacity-90 font-medium">Análisis de textos, gramática y rutas de aprendizaje gratuitas con IA.</p>
          </div>
          <div className="p-12 flex flex-col justify-center space-y-8">
            <div className="text-center md:text-left">
              <h2 className="text-3xl font-bold text-slate-800 mb-2">¡Hola Estudiante!</h2>
              <p className="text-slate-500">Accede a tu panel escolar inteligente y gratuito.</p>
            </div>
            <button 
              onClick={() => setIsLoggedIn(true)} 
              className="w-full bg-indigo-600 text-white font-bold py-4 rounded-xl hover:bg-indigo-700 shadow-lg shadow-indigo-100 transition-all hover:scale-[1.02]"
            >
              Comenzar ahora
            </button>
            <div className="flex items-start gap-2 text-xs text-slate-400 bg-slate-50 p-3 rounded-lg border border-slate-100">
              <AlertCircle size={14} className="shrink-0 mt-0.5 text-indigo-400" />
              <p>Privacidad garantizada: Tus datos y chats se guardan localmente en tu navegador.</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!user) return <ProfileSetup onComplete={handleProfileComplete} />;

  const activeSession = sessions.find(s => s.id === activeSessionId);

  return (
    <Layout activeView={activeView} setActiveView={setActiveView} user={user} onLogout={handleLogout}>
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
              content: `Analicemos este archivo de mi biblioteca: ${item.name}`,
              timestamp: Date.now(),
              attachments: [{ id: item.id, name: item.name, type: 'file', url: item.url, mimeType: item.type }]
            });
          }}
        />
      )}
      {activeView === 'profile' && (
        <div className="p-4 md:p-10 max-w-2xl mx-auto w-full overflow-y-auto h-full">
           <h1 className="text-4xl font-black mb-10 text-slate-800 tracking-tight">Mi Perfil</h1>
           <div className="bg-white rounded-3xl p-8 md:p-10 border border-slate-200 shadow-sm space-y-10">
              <div className="flex items-center gap-6">
                <div className="w-24 h-24 bg-indigo-600 text-white rounded-3xl flex items-center justify-center text-4xl font-black shadow-lg shadow-indigo-100">
                  {user.name[0]}
                </div>
                <div>
                  <h2 className="text-3xl font-bold text-slate-800">{user.name}</h2>
                  <p className="text-slate-500 font-medium text-lg">{user.grade}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100">
                  <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-1">Edad</p>
                  <p className="text-2xl font-bold text-slate-700">{user.age} años</p>
                </div>
                <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100">
                  <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-1">Curso</p>
                  <p className="text-2xl font-bold text-slate-700">{user.grade}</p>
                </div>
              </div>

              <div className="space-y-4 pt-4">
                <h3 className="text-sm font-black text-slate-400 uppercase tracking-widest">Invitar a compañeros</h3>
                <button 
                  onClick={handleShareApp}
                  className="w-full py-5 bg-indigo-50 text-indigo-700 rounded-2xl font-bold flex items-center justify-center gap-3 border-2 border-dashed border-indigo-200 hover:bg-indigo-100 transition-all group"
                >
                  {copySuccess ? <Check size={20} className="text-emerald-500" /> : <Share2 size={20} className="group-hover:scale-110 transition-transform" />}
                  {copySuccess ? '¡Enlace copiado!' : 'Compartir TutorIA'}
                </button>
                <p className="text-[10px] text-center text-slate-400">Envía esta app a tus amigos para que ellos también estudien con IA.</p>
              </div>

              <div className="pt-8 border-t border-slate-100 flex flex-col gap-3">
                <button 
                  onClick={() => { if(confirm("¿Estás seguro de que quieres borrar todos tus datos y conversaciones?")) { localStorage.clear(); indexedDB.deleteDatabase('TutorIA_DB'); window.location.reload(); } }}
                  className="w-full py-4 text-slate-400 hover:text-red-500 font-bold rounded-xl transition-colors flex items-center justify-center gap-2"
                >
                  Borrar todos mis datos locales
                </button>
              </div>
           </div>
        </div>
      )}
    </Layout>
  );
};

export default App;
