
import React, { useState } from 'react';
import { 
  Compass, 
  Sparkles, 
  Loader2, 
  ArrowRight, 
  CheckCircle2, 
  Info, 
  Lightbulb,
  BookOpen,
  ChevronRight
} from 'lucide-react';
import { UserProfile, LearningPath, LearningStep } from '../types.ts';
import { geminiService } from '../services/geminiService.ts';
import ReactMarkdown from 'react-markdown';

interface LearningPathsProps {
  user: UserProfile;
  paths: LearningPath[];
  onAddPath: (path: LearningPath) => void;
  onUpdatePath: (path: LearningPath) => void;
}

const LearningPaths: React.FC<LearningPathsProps> = ({ user, paths, onAddPath, onUpdatePath }) => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [topicInput, setTopicInput] = useState('');
  const [activePathId, setActivePathId] = useState<string | null>(null);
  const [userAnswer, setUserAnswer] = useState('');
  const [evaluating, setEvaluating] = useState(false);
  const [feedback, setFeedback] = useState<{ isCorrect: boolean; text: string } | null>(null);

  const activePath = paths.find(p => p.id === activePathId);
  const currentStep = activePath ? activePath.steps[activePath.currentStepIndex] : null;

  const suggestedTopics = [
    "Análisis de figuras retóricas",
    "Estructura del cuento fantástico",
    "Coherencia y cohesión textual",
    "Géneros literarios: La tragedia",
    "Ortografía: Acentuación de palabras"
  ];

  const handleGenerate = async (topic: string) => {
    setIsGenerating(true);
    try {
      const newPath = await geminiService.generateLearningPath(user, topic);
      onAddPath(newPath as LearningPath);
      setActivePathId(newPath.id!);
      setTopicInput('');
    } catch (error) {
      alert("Hubo un error al crear tu ruta de aprendizaje. Intenta con otro tema.");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSubmitAnswer = async () => {
    if (!activePath || !currentStep || !userAnswer.trim()) return;
    
    setEvaluating(true);
    setFeedback(null);
    try {
      const result = await geminiService.evaluateStepResponse(
        user, 
        currentStep.title, 
        currentStep.practiceQuestion, 
        userAnswer
      );
      
      setFeedback({ isCorrect: result.isCorrect, text: result.feedback });
      
      if (result.isCorrect) {
        const updatedSteps = [...activePath.steps];
        updatedSteps[activePath.currentStepIndex].isCompleted = true;
        
        const isLastStep = activePath.currentStepIndex === activePath.steps.length - 1;
        
        const updatedPath: LearningPath = {
          ...activePath,
          steps: updatedSteps,
          currentStepIndex: isLastStep ? activePath.currentStepIndex : activePath.currentStepIndex + 1,
          status: isLastStep ? 'completed' : 'in_progress',
          updatedAt: Date.now()
        };
        
        onUpdatePath(updatedPath);
        setUserAnswer('');
      }
    } catch (error) {
      console.error(error);
    } finally {
      setEvaluating(false);
    }
  };

  if (activePathId && activePath) {
    return (
      <div className="flex flex-col h-full bg-white overflow-hidden">
        <div className="bg-indigo-600 p-6 text-white flex items-center justify-between">
          <div>
            <button 
              onClick={() => setActivePathId(null)}
              className="text-indigo-100 text-sm hover:text-white transition-colors flex items-center gap-1 mb-1"
            >
              <ChevronRight size={16} className="rotate-180" /> Volver a rutas
            </button>
            <h2 className="text-xl font-bold">{activePath.topic}</h2>
          </div>
          <div className="flex gap-2">
            {activePath.steps.map((_, idx) => (
              <div 
                key={idx}
                className={`w-3 h-3 rounded-full border-2 border-white/30 ${
                  idx < activePath.currentStepIndex ? 'bg-emerald-400 border-emerald-400' :
                  idx === activePath.currentStepIndex ? 'bg-white' : ''
                }`}
              />
            ))}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6 md:p-10">
          {activePath.status === 'completed' ? (
            <div className="max-w-2xl mx-auto text-center space-y-6 py-12">
              <div className="w-24 h-24 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto">
                <CheckCircle2 size={48} />
              </div>
              <h1 className="text-3xl font-bold text-slate-800">¡Ruta Completada!</h1>
              <p className="text-slate-600">
                Has terminado con éxito la ruta sobre <strong>{activePath.topic}</strong>. 
                Sigue explorando nuevos temas para seguir aprendiendo.
              </p>
              <button 
                onClick={() => setActivePathId(null)}
                className="bg-indigo-600 text-white px-8 py-3 rounded-xl font-bold hover:bg-indigo-700 transition-all"
              >
                Ver otras rutas
              </button>
            </div>
          ) : currentStep ? (
            <div className="max-w-3xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="space-y-4">
                <span className="text-xs font-bold text-indigo-600 uppercase tracking-widest bg-indigo-50 px-3 py-1 rounded-full">
                  Paso {activePath.currentStepIndex + 1} de {activePath.steps.length}
                </span>
                <h1 className="text-3xl font-bold text-slate-800">{currentStep.title}</h1>
                <div className="prose prose-slate max-w-none text-slate-700 leading-relaxed">
                  <ReactMarkdown>{currentStep.content}</ReactMarkdown>
                </div>
              </div>

              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-6">
                <div className="flex items-center gap-2 text-indigo-600 font-bold mb-3">
                  <Lightbulb size={20} />
                  <h3>Ejemplo Orientativo</h3>
                </div>
                <div className="italic text-slate-600 bg-white p-4 rounded-xl border border-slate-100 shadow-sm">
                  {currentStep.example}
                </div>
              </div>

              <div className="bg-indigo-50 border-2 border-indigo-100 rounded-2xl p-6 md:p-8 space-y-6">
                <div className="flex items-center gap-2 text-indigo-800 font-bold">
                  <Sparkles size={20} />
                  <h3>Práctica del Paso</h3>
                </div>
                <p className="text-lg text-slate-800 font-medium">{currentStep.practiceQuestion}</p>
                
                <div className="space-y-4">
                  <textarea 
                    value={userAnswer}
                    onChange={(e) => setUserAnswer(e.target.value)}
                    placeholder="Escribe tu reflexión o respuesta aquí..."
                    className="w-full min-h-[120px] p-4 rounded-xl border-none ring-2 ring-indigo-100 focus:ring-indigo-400 outline-none transition-all resize-none"
                  />
                  
                  {feedback && (
                    <div className={`p-4 rounded-xl flex gap-3 ${feedback.isCorrect ? 'bg-emerald-50 text-emerald-800 border border-emerald-100' : 'bg-amber-50 text-amber-800 border border-amber-100'}`}>
                      {feedback.isCorrect ? <CheckCircle2 size={20} /> : <Info size={20} />}
                      <p className="text-sm font-medium">{feedback.text}</p>
                    </div>
                  )}

                  <div className="flex items-center justify-between gap-4">
                    <div className="group relative">
                       <button className="text-indigo-400 text-sm hover:text-indigo-600 flex items-center gap-1 transition-colors">
                         <Info size={16} /> Ver pista
                       </button>
                       <div className="absolute bottom-full left-0 mb-2 w-64 p-3 bg-slate-800 text-white text-xs rounded-lg opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity z-10">
                         {currentStep.hint}
                       </div>
                    </div>

                    <button 
                      onClick={handleSubmitAnswer}
                      disabled={!userAnswer.trim() || evaluating}
                      className={`px-8 py-3 rounded-xl font-bold flex items-center gap-2 transition-all ${
                        !userAnswer.trim() || evaluating 
                        ? 'bg-slate-200 text-slate-400 cursor-not-allowed' 
                        : 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-lg shadow-indigo-200'
                      }`}
                    >
                      {evaluating ? <Loader2 className="animate-spin" size={20} /> : 'Enviar Respuesta'}
                      {!evaluating && <ArrowRight size={20} />}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ) : null}
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-10 flex flex-col h-full bg-slate-50">
      <div className="max-w-5xl mx-auto w-full space-y-10">
        <header className="space-y-3">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-indigo-600 text-white rounded-2xl shadow-lg">
              <Compass size={32} />
            </div>
            <h1 className="text-4xl font-black text-slate-800 tracking-tight">Rutas de Aprendizaje</h1>
          </div>
          <p className="text-slate-500 text-lg max-w-2xl">
            Crea secuencias personalizadas de estudio para dominar temas específicos de Lengua y Literatura.
          </p>
        </header>

        <section className="bg-white rounded-3xl p-8 shadow-sm border border-slate-200 space-y-6">
          <h2 className="text-xl font-bold text-slate-800">¿Qué quieres aprender hoy?</h2>
          <div className="flex gap-3">
            <input 
              type="text"
              value={topicInput}
              onChange={(e) => setTopicInput(e.target.value)}
              placeholder="Ej: Análisis de la generación del 27..."
              className="flex-1 px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
            />
            <button 
              onClick={() => handleGenerate(topicInput)}
              disabled={!topicInput.trim() || isGenerating}
              className={`px-8 py-4 rounded-2xl font-bold flex items-center gap-2 transition-all ${
                !topicInput.trim() || isGenerating 
                ? 'bg-slate-200 text-slate-400' 
                : 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-xl shadow-indigo-100'
              }`}
            >
              {isGenerating ? <Loader2 className="animate-spin" size={20} /> : <Sparkles size={20} />}
              {isGenerating ? 'Generando...' : 'Crear Ruta'}
            </button>
          </div>

          <div className="flex flex-wrap gap-2 pt-2">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-widest block w-full mb-1">Sugerencias:</span>
            {suggestedTopics.map(topic => (
              <button 
                key={topic}
                onClick={() => setTopicInput(topic)}
                className="px-4 py-2 bg-slate-100 hover:bg-indigo-50 text-slate-600 hover:text-indigo-600 rounded-full text-sm transition-all border border-transparent hover:border-indigo-100"
              >
                {topic}
              </button>
            ))}
          </div>
        </section>

        {paths.length > 0 && (
          <section className="space-y-6">
            <h2 className="text-2xl font-bold text-slate-800">Tus Rutas Activas</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {paths.map(path => (
                <div 
                  key={path.id}
                  onClick={() => setActivePathId(path.id)}
                  className="bg-white p-6 rounded-3xl border border-slate-200 hover:border-indigo-500 hover:shadow-xl transition-all cursor-pointer group flex flex-col justify-between"
                >
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className={`p-2 rounded-xl ${path.status === 'completed' ? 'bg-emerald-100 text-emerald-600' : 'bg-indigo-100 text-indigo-600'}`}>
                        {path.status === 'completed' ? <CheckCircle2 size={24} /> : <BookOpen size={24} />}
                      </div>
                      <span className={`text-[10px] font-bold uppercase tracking-widest px-2 py-1 rounded ${
                        path.status === 'completed' ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'
                      }`}>
                        {path.status === 'completed' ? 'Completado' : 'En progreso'}
                      </span>
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-slate-800 group-hover:text-indigo-600 transition-colors">{path.topic}</h3>
                      <p className="text-sm text-slate-500 line-clamp-2 mt-1">{path.description}</p>
                    </div>
                  </div>

                  <div className="mt-6 pt-4 border-t border-slate-50 flex items-center justify-between">
                    <div className="text-xs text-slate-400">
                      Progreso: {Math.round((path.currentStepIndex / path.steps.length) * 100)}%
                    </div>
                    <div className="w-24 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-indigo-600" 
                        style={{ width: `${(path.currentStepIndex / path.steps.length) * 100}%` }}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
};

export default LearningPaths;
