
import React, { useState, useRef, useEffect } from 'react';
import { 
  Send, 
  Paperclip, 
  Mic, 
  Camera, 
  Loader2,
  X,
  Plus,
  FileText,
  BookOpen
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { geminiService } from '../services/geminiService';
import { UserProfile, Message, Attachment } from '../types';

interface ChatInterfaceProps {
  user: UserProfile;
  currentChat: Message[];
  onSendMessage: (msg: Message) => void;
  isProcessing: boolean;
}

const ChatInterface: React.FC<ChatInterfaceProps> = ({ user, currentChat, onSendMessage, isProcessing }) => {
  const [input, setInput] = useState('');
  const [pendingAttachments, setPendingAttachments] = useState<Attachment[]>([]);
  const [showTools, setShowTools] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [showCamera, setShowCamera] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const toolsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [currentChat]);

  // Cerrar el menú de herramientas al hacer click fuera
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (toolsRef.current && !toolsRef.current.contains(event.target as Node)) {
        setShowTools(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSend = async () => {
    if (!input.trim() && pendingAttachments.length === 0) return;

    const userMsg: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input,
      timestamp: Date.now(),
      attachments: pendingAttachments
    };

    onSendMessage(userMsg);
    setInput('');
    setPendingAttachments([]);
    setShowTools(false);
  };

  const handleFileClick = () => {
    fileInputRef.current?.click();
    setShowTools(false);
  };

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    Array.from(files).forEach((file: File) => {
      const reader = new FileReader();
      reader.onload = (event) => {
        const type = file.type.startsWith('image/') ? 'image' : 
                     file.type.startsWith('audio/') ? 'audio' : 'file';
        
        const newAttachment: Attachment = {
          id: Math.random().toString(36).substr(2, 9),
          name: file.name,
          type: type as any,
          url: event.target?.result as string,
          mimeType: file.type
        };
        setPendingAttachments(prev => [...prev, newAttachment]);
      };
      reader.readAsDataURL(file);
    });
  };

  const startCamera = async () => {
    try {
      setShowTools(false);
      setShowCamera(true);
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      if (videoRef.current) videoRef.current.srcObject = stream;
    } catch (err) {
      alert("No se pudo acceder a la cámara.");
      setShowCamera(false);
    }
  };

  const takePhoto = () => {
    const canvas = document.createElement('canvas');
    if (videoRef.current) {
      canvas.width = videoRef.current.videoWidth;
      canvas.height = videoRef.current.videoHeight;
      canvas.getContext('2d')?.drawImage(videoRef.current, 0, 0);
      const url = canvas.toDataURL('image/jpeg');
      
      const newAttachment: Attachment = {
        id: Date.now().toString(),
        name: `Foto_${new Date().toLocaleTimeString()}.jpg`,
        type: 'image',
        url: url,
        mimeType: 'image/jpeg'
      };
      setPendingAttachments(prev => [...prev, newAttachment]);
      stopCamera();
    }
  };

  const stopCamera = () => {
    const stream = videoRef.current?.srcObject as MediaStream;
    stream?.getTracks().forEach(track => track.stop());
    setShowCamera(false);
  };

  const toggleRecording = async () => {
    if (isRecording) {
      mediaRecorderRef.current?.stop();
      setIsRecording(false);
      setShowTools(false);
    } else {
      try {
        setShowTools(false);
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        const recorder = new MediaRecorder(stream);
        mediaRecorderRef.current = recorder;
        const chunks: Blob[] = [];

        recorder.ondataavailable = (e) => chunks.push(e.data);
        recorder.onstop = () => {
          const blob = new Blob(chunks, { type: 'audio/webm' });
          const reader = new FileReader();
          reader.onload = (e) => {
            const newAttachment: Attachment = {
              id: Date.now().toString(),
              name: `Audio_${new Date().toLocaleTimeString()}.webm`,
              type: 'audio',
              url: e.target?.result as string,
              mimeType: 'audio/webm'
            };
            setPendingAttachments(prev => [...prev, newAttachment]);
          };
          reader.readAsDataURL(blob);
          stream.getTracks().forEach(track => track.stop());
        };

        recorder.start();
        setIsRecording(true);
      } catch (err) {
        alert("No se pudo acceder al micrófono.");
      }
    }
  };

  return (
    <div className="flex flex-col h-full relative">
      <div 
        ref={scrollRef}
        className="flex-1 overflow-y-auto p-4 md:p-8 space-y-6 scroll-smooth"
      >
        {currentChat.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center space-y-4 max-w-lg mx-auto">
            <div className="w-20 h-20 bg-indigo-100 rounded-full flex items-center justify-center">
              <BookOpen className="text-indigo-600 w-10 h-10" />
            </div>
            <h2 className="text-2xl font-bold text-slate-800">¡Hola, {user.name}!</h2>
            <p className="text-slate-600">
              Soy tu TutorIA de Lengua y Literatura. ¿En qué puedo ayudarte hoy con tus lecturas, análisis o redacción?
            </p>
          </div>
        )}

        {currentChat.map((msg) => (
          <div 
            key={msg.id} 
            className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div className={`max-w-[85%] md:max-w-[70%] rounded-2xl p-4 shadow-sm ${
              msg.role === 'user' 
                ? 'bg-indigo-600 text-white rounded-tr-none' 
                : 'bg-white border border-slate-200 text-slate-800 rounded-tl-none'
            }`}>
              {msg.attachments && msg.attachments.length > 0 && (
                <div className="mb-3 space-y-2">
                  {msg.attachments.map(att => (
                    <div key={att.id} className="rounded-lg overflow-hidden border border-white/20">
                      {att.type === 'image' ? (
                        <img src={att.url} alt={att.name} className="max-w-full h-auto" />
                      ) : (
                        <div className={`p-2 flex items-center gap-2 text-xs ${msg.role === 'user' ? 'bg-indigo-500' : 'bg-slate-100'}`}>
                          <FileText size={16} />
                          <span className="truncate">{att.name}</span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
              <div className="prose prose-sm max-w-none prose-slate">
                <ReactMarkdown className={msg.role === 'user' ? 'text-white' : 'text-slate-800'}>
                  {msg.content}
                </ReactMarkdown>
              </div>
            </div>
          </div>
        ))}
        {isProcessing && (
          <div className="flex justify-start">
            <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm flex items-center gap-3">
              <Loader2 className="animate-spin text-indigo-600" size={18} />
              <span className="text-sm text-slate-500 font-medium">TutorIA está pensando...</span>
            </div>
          </div>
        )}
      </div>

      <div className="p-4 md:p-6 bg-white border-t border-slate-200 relative">
        {/* Vista previa de adjuntos pendientes */}
        {pendingAttachments.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-3 max-w-5xl mx-auto">
            {pendingAttachments.map((att) => (
              <div key={att.id} className="relative group bg-slate-100 rounded-lg p-2 flex items-center gap-2 border border-slate-200 animate-in zoom-in-95 duration-200">
                {att.type === 'image' ? (
                  <div className="w-10 h-10 rounded bg-slate-200 overflow-hidden">
                    <img src={att.url} className="w-full h-full object-cover" />
                  </div>
                ) : <FileText size={16} className="text-indigo-600" />}
                <span className="text-[10px] font-bold text-slate-600 max-w-[80px] truncate">{att.name}</span>
                <button 
                  onClick={() => setPendingAttachments(prev => prev.filter(p => p.id !== att.id))}
                  className="bg-red-500 text-white rounded-full p-0.5 -mt-1 -mr-1 shadow-sm hover:scale-110 transition-transform"
                >
                  <X size={10} />
                </button>
              </div>
            ))}
          </div>
        )}

        <div className="flex items-end gap-3 max-w-5xl mx-auto relative">
          <div className="relative" ref={toolsRef}>
            <button 
              onClick={() => setShowTools(!showTools)}
              className={`p-3 rounded-2xl transition-all ${showTools ? 'bg-indigo-600 text-white rotate-45' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}
            >
              <Plus size={24} />
            </button>
            
            {showTools && (
              <div className="absolute bottom-full mb-4 left-0 flex flex-col gap-2 bg-white p-2 rounded-2xl shadow-2xl border border-slate-100 animate-in slide-in-from-bottom-2 duration-200 z-30">
                <button 
                  onClick={handleFileClick} 
                  className="p-3 flex items-center gap-3 text-slate-600 hover:bg-indigo-50 hover:text-indigo-600 rounded-xl transition-colors whitespace-nowrap"
                >
                  <div className="bg-blue-100 p-2 rounded-lg text-blue-600"><Paperclip size={20} /></div>
                  <span className="text-sm font-bold pr-2">Documento</span>
                </button>
                <button 
                  onClick={startCamera} 
                  className="p-3 flex items-center gap-3 text-slate-600 hover:bg-indigo-50 hover:text-indigo-600 rounded-xl transition-colors whitespace-nowrap"
                >
                  <div className="bg-emerald-100 p-2 rounded-lg text-emerald-600"><Camera size={20} /></div>
                  <span className="text-sm font-bold pr-2">Cámara</span>
                </button>
                <button 
                  onClick={toggleRecording} 
                  className={`p-3 flex items-center gap-3 text-slate-600 hover:bg-indigo-50 hover:text-indigo-600 rounded-xl transition-colors whitespace-nowrap ${isRecording ? 'animate-pulse text-red-600' : ''}`}
                >
                  <div className={`p-2 rounded-lg ${isRecording ? 'bg-red-100 text-red-600' : 'bg-amber-100 text-amber-600'}`}><Mic size={20} /></div>
                  <span className="text-sm font-bold pr-2">{isRecording ? 'Grabando...' : 'Audio'}</span>
                </button>
              </div>
            )}
          </div>

          <div className="flex-1 relative">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => { 
                if (e.key === 'Enter' && !e.shiftKey) { 
                  e.preventDefault(); 
                  handleSend(); 
                } 
              }}
              placeholder="Escribe tu consulta aquí..."
              className="w-full bg-slate-100 border-none rounded-2xl px-5 py-3.5 text-slate-800 focus:ring-2 focus:ring-indigo-500 resize-none max-h-48 transition-all scrollbar-hide"
              rows={1}
              style={{ minHeight: '52px' }}
            />
          </div>

          <button 
            onClick={handleSend} 
            disabled={(!input.trim() && pendingAttachments.length === 0) || isProcessing} 
            className="p-3.5 rounded-2xl bg-indigo-600 text-white disabled:bg-slate-200 disabled:text-slate-400 hover:bg-indigo-700 shadow-lg shadow-indigo-100 transition-all active:scale-95 flex items-center justify-center min-w-[52px]"
          >
            {isProcessing ? <Loader2 className="animate-spin" size={20} /> : <Send size={22} />}
          </button>
        </div>
        <input type="file" ref={fileInputRef} className="hidden" multiple onChange={onFileChange} />
      </div>

      {showCamera && (
        <div className="fixed inset-0 z-50 bg-black flex flex-col items-center justify-center">
          <video ref={videoRef} autoPlay className="max-w-full max-h-[80vh]" />
          <div className="flex gap-6 mt-8">
            <button onClick={stopCamera} className="p-4 bg-red-500 text-white rounded-full hover:scale-110 transition-transform"><X size={24} /></button>
            <button onClick={takePhoto} className="p-4 bg-white text-indigo-600 rounded-full hover:scale-110 transition-transform shadow-xl"><Camera size={32} /></button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ChatInterface;
