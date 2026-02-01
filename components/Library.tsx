
import React from 'react';
import { 
  FileText, 
  Image as ImageIcon, 
  Download, 
  Trash2, 
  MessageSquare,
  Search
} from 'lucide-react';
import { LibraryItem, Attachment } from '../types';

interface LibraryProps {
  items: LibraryItem[];
  onDeleteItem: (id: string) => void;
  onUseInChat: (item: LibraryItem) => void;
}

const Library: React.FC<LibraryProps> = ({ items, onDeleteItem, onUseInChat }) => {
  const [searchTerm, setSearchTerm] = React.useState('');

  const filteredItems = items.filter(item => 
    item.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="p-4 md:p-8 flex flex-col h-full bg-slate-50">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-800 mb-2">Mi Biblioteca</h1>
        <p className="text-slate-500">Accede a todos tus documentos e imágenes compartidos con TutorIA.</p>
      </div>

      <div className="flex flex-col md:flex-row gap-4 mb-8">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
          <input 
            type="text"
            placeholder="Buscar archivos..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-3 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 transition-all shadow-sm"
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {filteredItems.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-slate-400 bg-white border-2 border-dashed border-slate-200 rounded-2xl">
            <FileText size={48} className="mb-4 opacity-20" />
            <p className="font-medium text-slate-500">No hay archivos en tu biblioteca todavía.</p>
            <p className="text-sm">Adjunta archivos en el chat para que aparezcan aquí.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredItems.map((item) => (
              <div key={item.id} className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm group hover:shadow-md transition-all">
                <div className="h-40 bg-slate-100 flex items-center justify-center border-b border-slate-100 relative">
                  {item.type.includes('image') ? (
                    <img src={item.url} alt={item.name} className="w-full h-full object-cover" />
                  ) : item.type === 'application/pdf' ? (
                    <div className="bg-white p-4 rounded-xl shadow-sm text-center">
                      <FileText className="text-red-500 mx-auto" size={40} />
                      <span className="text-[10px] font-bold text-red-500 mt-2 block">PDF</span>
                    </div>
                  ) : (
                    <div className="bg-white p-4 rounded-xl shadow-sm">
                      <FileText className="text-indigo-500" size={40} />
                    </div>
                  )}
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                    <button 
                      onClick={() => onUseInChat(item)}
                      className="p-2 bg-white rounded-full text-indigo-600 hover:bg-indigo-50 transition-colors"
                      title="Usar en chat"
                    >
                      <MessageSquare size={20} />
                    </button>
                    <a 
                      href={item.url} 
                      download={item.name}
                      className="p-2 bg-white rounded-full text-slate-800 hover:text-indigo-600 transition-colors"
                      title="Descargar"
                    >
                      <Download size={20} />
                    </a>
                    <button 
                      onClick={() => onDeleteItem(item.id)}
                      className="p-2 bg-white rounded-full text-slate-800 hover:text-red-600 transition-colors"
                      title="Eliminar"
                    >
                      <Trash2 size={20} />
                    </button>
                  </div>
                </div>
                <div className="p-4">
                  <h3 className="font-semibold text-slate-800 truncate" title={item.name}>{item.name}</h3>
                  <div className="flex items-center justify-between mt-2">
                    <span className="text-xs text-slate-400">
                      {new Date(item.uploadedAt).toLocaleDateString()}
                    </span>
                    <span className="text-[10px] font-bold text-indigo-600 bg-indigo-50 px-2 py-1 rounded uppercase tracking-wider">
                      {item.type.split('/')[1]?.toUpperCase() || 'DOC'}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Library;
