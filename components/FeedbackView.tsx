
import React from 'react';
import { InterviewSession } from '../types';
import { Star, TrendingUp, AlertTriangle, Lightbulb, CheckCircle2, MessageCircle, Activity, Mic } from 'lucide-react';

interface FeedbackViewProps {
  session: InterviewSession;
  onBack: () => void;
}

const FeedbackView: React.FC<FeedbackViewProps> = ({ session, onBack }) => {
  const { feedback } = session;

  if (!feedback) {
    return (
      <div className="flex flex-col items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
        <p className="mt-4 text-slate-500 font-medium">Analyzing your interview performance...</p>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-10">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Interview Performance</h1>
          <p className="text-slate-500 mt-1">{session.setup.jobTitle} • {session.setup.difficulty} level • {new Date(session.date).toLocaleDateString()}</p>
        </div>
        <div className="flex flex-col items-end">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Overall Score</span>
          <div className="flex items-center gap-2 bg-indigo-600 text-white px-5 py-2 rounded-full text-2xl font-black shadow-lg shadow-indigo-200">
            <Star size={24} fill="currentColor" />
            {feedback.overallScore}/100
          </div>
        </div>
      </div>

      {/* Speech Analytics Module */}
      {feedback.speechMetrics && (
        <div className="bg-slate-900 text-white p-8 rounded-3xl shadow-xl space-y-6">
          <div className="flex items-center gap-3 text-indigo-400 font-bold text-xl">
            <Activity size={24} />
            Speech Analytics
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-8">
            <div className="text-center space-y-2">
              <p className="text-slate-400 text-xs font-black uppercase tracking-widest">Filler Words</p>
              <p className="text-4xl font-black text-white">{feedback.speechMetrics.fillerWordCount}</p>
              <p className="text-xs text-slate-500">Total detected (um, uh, like...)</p>
            </div>
            <div className="text-center space-y-2">
              <p className="text-slate-400 text-xs font-black uppercase tracking-widest">Speaking Pace</p>
              <p className="text-2xl font-black text-indigo-300">{feedback.speechMetrics.paceDescription}</p>
              <p className="text-xs text-slate-500">Overall speed & rhythm</p>
            </div>
            <div className="text-center space-y-2">
              <p className="text-slate-400 text-xs font-black uppercase tracking-widest">Clarity Score</p>
              <p className="text-4xl font-black text-emerald-400">{feedback.speechMetrics.clarityScore}%</p>
              <p className="text-xs text-slate-500">Articulation & Enunciation</p>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white p-8 rounded-3xl border border-slate-100 shadow-sm space-y-4">
          <div className="flex items-center gap-3 text-emerald-600 font-bold mb-2">
            <TrendingUp size={24} />
            Key Strengths
          </div>
          <ul className="space-y-3">
            {feedback.strengths.map((s, i) => (
              <li key={i} className="flex items-start gap-3 text-slate-700">
                <CheckCircle2 size={18} className="text-emerald-500 mt-1 flex-shrink-0" />
                <span>{s}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="bg-white p-8 rounded-3xl border border-slate-100 shadow-sm space-y-4">
          <div className="flex items-center gap-3 text-amber-600 font-bold mb-2">
            <AlertTriangle size={24} />
            Growth Areas
          </div>
          <ul className="space-y-3">
            {feedback.weaknesses.map((w, i) => (
              <li key={i} className="flex items-start gap-3 text-slate-700">
                <div className="w-1.5 h-1.5 bg-amber-500 rounded-full mt-2.5 flex-shrink-0" />
                <span>{w}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="bg-indigo-50 p-8 rounded-3xl border border-indigo-100 space-y-6">
        <div className="flex items-center gap-3 text-indigo-700 font-extrabold text-xl">
          <Lightbulb size={24} />
          Detailed Analysis
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="space-y-3">
            <h4 className="text-xs font-black text-indigo-900 uppercase tracking-widest flex items-center gap-2">
              <MessageCircle size={14} /> Content & Reasoning
            </h4>
            <p className="text-slate-700 leading-relaxed text-sm bg-white/50 p-4 rounded-2xl">
              {feedback.contentFeedback}
            </p>
          </div>
          <div className="space-y-3">
            <h4 className="text-xs font-black text-indigo-900 uppercase tracking-widest flex items-center gap-2">
              <Mic size={14} /> Delivery & Speech
            </h4>
            <p className="text-slate-700 leading-relaxed text-sm bg-white/50 p-4 rounded-2xl">
              {feedback.speechFeedback}
            </p>
          </div>
        </div>
      </div>

      <div className="bg-white p-8 rounded-3xl border border-slate-100 shadow-sm">
         <h4 className="text-lg font-bold text-slate-900 mb-6">Actionable Next Steps</h4>
         <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
           {feedback.improvementTips.map((tip, i) => (
             <div key={i} className="bg-slate-50 p-5 rounded-2xl text-sm font-medium text-slate-700 border border-slate-100 flex items-start gap-3">
               <div className="w-6 h-6 bg-indigo-100 text-indigo-600 rounded-lg flex items-center justify-center text-xs font-black flex-shrink-0">{i + 1}</div>
               {tip}
             </div>
           ))}
         </div>
      </div>

      <div className="flex justify-center pt-6 pb-12">
        <button 
          onClick={onBack}
          className="bg-slate-900 text-white px-10 py-4 rounded-2xl font-bold hover:bg-slate-800 transition shadow-lg"
        >
          Return to Dashboard
        </button>
      </div>
    </div>
  );
};

export default FeedbackView;
