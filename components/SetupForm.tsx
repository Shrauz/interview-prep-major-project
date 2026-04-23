
import React, { useState } from 'react';
import { InterviewSetup, Difficulty, Persona } from '../types';
import { Briefcase, Clock, Cpu, FileText, ArrowRight, UserCircle, Gauge, Sparkles, ListOrdered } from 'lucide-react';

interface SetupFormProps {
  onStart: (setup: InterviewSetup) => void;
}

const personas: { id: Persona; label: string; desc: string }[] = [
  { id: 'Friendly', label: 'Encouraging', desc: 'Patient and supportive' },
  { id: 'Direct', label: 'Direct', desc: 'No-nonsense and concise' },
  { id: 'Technical', label: 'Technical Expert', desc: 'Critical and deep dives' },
];

const SetupForm: React.FC<SetupFormProps> = ({ onStart }) => {
  const [setup, setSetup] = useState<InterviewSetup>({
    jobTitle: '',
    jobDescription: '',
    yearsOfExperience: 2,
    techStack: '',
    questionCount: 5,
    difficulty: 'Mid',
    persona: 'Friendly'
  });

  return (
    <div className="max-w-3xl mx-auto">
      <div className="mb-8 text-center">
        <h1 className="text-4xl font-extrabold text-slate-900 tracking-tight">Design Your Challenge</h1>
        <p className="text-slate-500 mt-2">Personalize the difficulty and interviewer persona for a realistic experience.</p>
      </div>

      <div className="bg-white rounded-3xl p-8 md:p-10 shadow-xl shadow-indigo-100 border border-slate-100 space-y-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="space-y-2">
            <label className="text-sm font-bold text-slate-700 flex items-center gap-2">
              <Briefcase size={16} className="text-indigo-500" /> Job Title
            </label>
            <input 
              type="text"
              placeholder="e.g. Senior Frontend Engineer"
              className="w-full p-4 rounded-xl border-2 border-slate-100 focus:border-indigo-500 outline-none transition text-slate-700 font-medium"
              value={setup.jobTitle}
              onChange={e => setSetup({...setup, jobTitle: e.target.value})}
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-bold text-slate-700 flex items-center gap-2">
              <Clock size={16} className="text-indigo-500" /> Years of Experience
            </label>
            <input 
              type="number"
              className="w-full p-4 rounded-xl border-2 border-slate-100 focus:border-indigo-500 outline-none transition text-slate-700 font-medium"
              value={setup.yearsOfExperience}
              onChange={e => setSetup({...setup, yearsOfExperience: parseInt(e.target.value) || 0})}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="space-y-4">
            <label className="text-sm font-bold text-slate-700 flex items-center gap-2">
              <Gauge size={16} className="text-indigo-500" /> Difficulty Level
            </label>
            <div className="flex bg-slate-100 p-1.5 rounded-2xl">
              {(['Junior', 'Mid', 'Senior'] as Difficulty[]).map((level) => (
                <button
                  key={level}
                  type="button"
                  onClick={() => setSetup({...setup, difficulty: level})}
                  className={`flex-1 py-3 rounded-xl font-bold text-sm transition-all ${
                    setup.difficulty === level 
                    ? 'bg-white text-indigo-600 shadow-sm' 
                    : 'text-slate-500 hover:text-slate-700'
                  }`}
                >
                  {level}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-4">
            <label className="text-sm font-bold text-slate-700 flex items-center gap-2">
              <ListOrdered size={16} className="text-indigo-500" /> Number of Questions
            </label>
            <div className="flex bg-slate-100 p-1.5 rounded-2xl">
              {[3, 5, 10, 15].map((count) => (
                <button
                  key={count}
                  type="button"
                  onClick={() => setSetup({...setup, questionCount: count})}
                  className={`flex-1 py-3 rounded-xl font-bold text-sm transition-all ${
                    setup.questionCount === count 
                    ? 'bg-white text-indigo-600 shadow-sm' 
                    : 'text-slate-500 hover:text-slate-700'
                  }`}
                >
                  {count}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <label className="text-sm font-bold text-slate-700 flex items-center gap-2">
            <UserCircle size={16} className="text-indigo-500" /> Interviewer Persona
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {personas.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => setSetup({...setup, persona: p.id})}
                className={`text-left p-4 rounded-2xl border-2 transition-all ${
                  setup.persona === p.id 
                  ? 'border-indigo-500 bg-indigo-50/50' 
                  : 'border-slate-100 hover:border-slate-200'
                }`}
              >
                <p className={`font-bold text-sm ${setup.persona === p.id ? 'text-indigo-700' : 'text-slate-700'}`}>{p.label}</p>
                <p className="text-xs text-slate-500 mt-1">{p.desc}</p>
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-bold text-slate-700 flex items-center gap-2">
            <Cpu size={16} className="text-indigo-500" /> Tech Stack / Skills
          </label>
          <input 
            type="text"
            placeholder="e.g. React, TypeScript, GraphQL, AWS"
            className="w-full p-4 rounded-xl border-2 border-slate-100 focus:border-indigo-500 outline-none transition text-slate-700 font-medium"
            value={setup.techStack}
            onChange={e => setSetup({...setup, techStack: e.target.value})}
          />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-bold text-slate-700 flex items-center gap-2">
            <FileText size={16} className="text-indigo-500" /> Job Description
          </label>
          <textarea 
            rows={4}
            placeholder="Paste the key responsibilities..."
            className="w-full p-4 rounded-xl border-2 border-slate-100 focus:border-indigo-500 outline-none transition text-slate-700 font-medium resize-none"
            value={setup.jobDescription}
            onChange={e => setSetup({...setup, jobDescription: e.target.value})}
          />
        </div>

        <div className="pt-4">
          <button 
            onClick={() => onStart(setup)}
            disabled={!setup.jobTitle || !setup.jobDescription}
            className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white p-5 rounded-2xl font-bold text-lg transition flex items-center justify-center gap-3 shadow-lg shadow-indigo-200 group"
          >
            <Sparkles size={22} className="group-hover:rotate-12 transition-transform" />
            Generate & Save Interview <ArrowRight size={22} />
          </button>
          <p className="text-center text-slate-400 text-xs font-medium mt-4 italic">
            Questions will be saved to your profile so you can practice anytime.
          </p>
        </div>
      </div>
    </div>
  );
};

export default SetupForm;
