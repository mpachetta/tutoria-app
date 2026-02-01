
import React from 'react';
import { 
  MessageSquare, 
  Library, 
  History as HistoryIcon, 
  LogOut, 
  User, 
  BookOpen,
  Menu,
  X,
  Compass
} from 'lucide-react';

interface LayoutProps {
  children: React.ReactNode;
  activeView: 'chat' | 'history' | 'library' | 'profile' | 'paths';
  setActiveView: (view: 'chat' | 'history' | 'library' | 'profile' | 'paths') => void;
  user: any;
  onLogout: () => void;
}

const Layout: React.FC<LayoutProps> = ({ children, activeView, setActiveView, user, onLogout }) => {
  const [isSidebarOpen, setIsSidebarOpen] = React.useState(false);

  const navItems = [
    { id: 'chat', label: 'TutorIA Chat', icon: MessageSquare },
    { id: 'paths', label: 'Rutas de Aprendizaje', icon: Compass },
    { id: 'history', label: 'Historial', icon: HistoryIcon },
    { id: 'library', label: 'Mi Biblioteca', icon: Library },
    { id: 'profile', label: 'Mi Perfil', icon: User },
  ];

  const NavContent = () => (
    <div className="flex flex-col h-full bg-indigo-900 text-white">
      <div className="p-6 flex items-center gap-3">
        <div className="bg-white p-2 rounded-xl">
          <BookOpen className="text-indigo-900 w-6 h-6" />
        </div>
        <h1 className="text-2xl font-bold tracking-tight">TutorIA</h1>
      </div>

      <nav className="flex-1 px-4 py-6 space-y-2">
        {navItems.map((item) => (
          <button
            key={item.id}
            onClick={() => {
              setActiveView(item.id as any);
              setIsSidebarOpen(false);
            }}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${
              activeView === item.id 
                ? 'bg-white text-indigo-900 shadow-lg' 
                : 'hover:bg-indigo-800 text-indigo-100'
            }`}
          >
            <item.icon size={20} />
            <span className="font-medium">{item.label}</span>
          </button>
        ))}
      </nav>

      <div className="p-4 border-t border-indigo-800">
        <div className="flex items-center gap-3 px-4 py-3 mb-4">
          <div className="w-10 h-10 rounded-full bg-indigo-700 flex items-center justify-center font-bold text-white border-2 border-indigo-400">
            {user?.name?.[0] || 'U'}
          </div>
          <div className="overflow-hidden">
            <p className="font-semibold truncate">{user?.name}</p>
            <p className="text-xs text-indigo-300 truncate">{user?.grade}</p>
          </div>
        </div>
        <button
          onClick={onLogout}
          className="w-full flex items-center gap-3 px-4 py-3 text-indigo-200 hover:text-white hover:bg-indigo-800 rounded-lg transition-colors"
        >
          <LogOut size={20} />
          <span>Cerrar Sesión</span>
        </button>
      </div>
    </div>
  );

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden">
      {/* Mobile Sidebar Toggle */}
      <button 
        className="lg:hidden fixed top-4 left-4 z-50 p-2 bg-indigo-600 text-white rounded-lg shadow-lg"
        onClick={() => setIsSidebarOpen(!isSidebarOpen)}
      >
        {isSidebarOpen ? <X size={24} /> : <Menu size={24} />}
      </button>

      {/* Desktop Sidebar */}
      <aside className="hidden lg:block w-72 h-full shadow-2xl z-20">
        <NavContent />
      </aside>

      {/* Mobile Sidebar Overlay */}
      {isSidebarOpen && (
        <div className="lg:hidden fixed inset-0 z-40 bg-black/50 backdrop-blur-sm" onClick={() => setIsSidebarOpen(false)}>
          <div className="w-72 h-full" onClick={e => e.stopPropagation()}>
            <NavContent />
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col min-w-0 bg-slate-50 relative h-full">
        {children}
      </main>
    </div>
  );
};

export default Layout;
