
import React, { useState } from 'react';
import { User, BookOpen, ArrowRight } from 'lucide-react';
import { UserProfile } from '../types';

interface ProfileSetupProps {
  onComplete: (profile: Omit<UserProfile, 'id' | 'email'>) => void;
}

const ProfileSetup: React.FC<ProfileSetupProps> = ({ onComplete }) => {
  const [formData, setFormData] = useState({
    name: '',
    age: ''
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.name && formData.age) {
      onComplete({
        name: formData.name,
        age: parseInt(formData.age)
      });
    }
  };

  return (
    <div className="min-h-screen bg-indigo-600 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-3xl shadow-2xl overflow-hidden p-8 md:p-10">
        <div className="flex justify-center mb-8">
          <div className="bg-indigo-100 p-4 rounded-2xl">
            <BookOpen className="text-indigo-600 w-10 h-10" />
          </div>
        </div>

        <h1 className="text-3xl font-bold text-center text-slate-800 mb-2">¡Hola Estudiante!</h1>
        <p className="text-center text-slate-500 mb-10">Completemos tu perfil para que TutorIA adapte sus explicaciones.</p>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <label className="text-sm font-semibold text-slate-700 ml-1">¿Cómo te llamas?</label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
              <input 
                required
                type="text"
                value={formData.name}
                onChange={e => setFormData({...formData, name: e.target.value})}
                placeholder="Nombre completo"
                className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:bg-white outline-none transition-all"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-semibold text-slate-700 ml-1">Edad</label>
            <input 
              required
              type="number"
              min="5"
              max="99"
              value={formData.age}
              onChange={e => setFormData({...formData, age: e.target.value})}
              placeholder="Ej. 14"
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:bg-white outline-none transition-all"
            />
          </div>

          <button 
            type="submit"
            className="w-full bg-indigo-600 text-white font-bold py-4 rounded-xl shadow-lg shadow-indigo-200 hover:bg-indigo-700 transition-all flex items-center justify-center gap-2 group"
          >
            Comenzar con TutorIA
            <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
          </button>
        </form>
      </div>
    </div>
  );
};

export default ProfileSetup;
