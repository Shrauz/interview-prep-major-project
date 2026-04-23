
import React from 'react';
import { Mic, BarChart3, Users, Zap, ArrowRight, ShieldCheck, Sparkles } from 'lucide-react';

interface LandingPageProps {
  onGetStarted: () => void;
  onLogin: () => void;
}

const LandingPage: React.FC<LandingPageProps> = ({ onGetStarted, onLogin }) => {
  return (
    <div className="min-h-screen bg-slate-50">
      {/* Navigation */}
      <nav className="flex justify-between items-center px-8 py-6 max-w-7xl mx-auto">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center font-bold text-white text-xl italic shadow-lg shadow-indigo-200">H</div>
          <span className="text-2xl font-black text-slate-900 tracking-tight">HirePrep AI</span>
        </div>
        <div className="flex items-center gap-6">
          <button onClick={onLogin} className="text-slate-600 font-bold hover:text-indigo-600 transition">Log In</button>
          <button onClick={onGetStarted} className="bg-slate-900 text-white px-6 py-3 rounded-xl font-bold hover:bg-slate-800 transition shadow-lg">Sign Up</button>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="px-8 pt-20 pb-32 max-w-7xl mx-auto text-center">
        <div className="inline-flex items-center gap-2 bg-indigo-50 text-indigo-700 px-4 py-2 rounded-full text-sm font-bold mb-8 animate-bounce">
          <Sparkles size={16} />
          Powered by Gemini 2.5 Native Audio
        </div>
        <h1 className="text-6xl md:text-7xl font-black text-slate-900 leading-[1.1] mb-8 tracking-tight">
          Master the Interview <br />
          <span className="text-indigo-600">With Real AI Voices.</span>
        </h1>
        <p className="text-xl text-slate-500 max-w-2xl mx-auto mb-12 font-medium leading-relaxed">
          The only mock interview platform that listens, talks, and analyzes your performance in real-time. Practice with custom personas and get deep speech analytics.
        </p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <button 
            onClick={onGetStarted}
            className="w-full sm:w-auto bg-indigo-600 text-white px-10 py-5 rounded-2xl font-black text-xl hover:bg-indigo-700 transition flex items-center justify-center gap-3 shadow-xl shadow-indigo-200 group"
          >
            Start Practicing Free <ArrowRight className="group-hover:translate-x-1 transition" />
          </button>
          <p className="text-slate-400 text-sm font-medium">No credit card required.</p>
        </div>
      </section>

      {/* Features Grid */}
      <section className="px-8 py-24 bg-white border-y border-slate-100">
        <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-12">
          <div className="space-y-4">
            <div className="w-14 h-14 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center">
              <Mic size={28} />
            </div>
            <h3 className="text-2xl font-bold text-slate-900">Real-time Voice AI</h3>
            <p className="text-slate-500 leading-relaxed font-medium">
              Engage in fluid, low-latency conversations with AI interviewers that sound human and react to your answers.
            </p>
          </div>
          <div className="space-y-4">
            <div className="w-14 h-14 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center">
              <BarChart3 size={28} />
            </div>
            <h3 className="text-2xl font-bold text-slate-900">Speech Analytics</h3>
            <p className="text-slate-500 leading-relaxed font-medium">
              Track filler words, pace, and clarity. Get actionable feedback on how you sound, not just what you say.
            </p>
          </div>
          <div className="space-y-4">
            <div className="w-14 h-14 bg-amber-50 text-amber-600 rounded-2xl flex items-center justify-center">
              <Users size={28} />
            </div>
            <h3 className="text-2xl font-bold text-slate-900">Custom Personas</h3>
            <div className="text-slate-500 leading-relaxed font-medium">
              From friendly mentors to direct technical leads. Prepare for any interviewer personality type.
            </div>
          </div>
        </div>
      </section>

      {/* Trust Section */}
      <section className="px-8 py-20 max-w-7xl mx-auto flex flex-col items-center">
        <div className="flex items-center gap-2 text-slate-400 font-bold uppercase tracking-widest text-sm mb-10">
          <ShieldCheck size={18} /> Trusted by thousands of engineers
        </div>
        <div className="flex flex-wrap justify-center gap-12 opacity-50 grayscale">
          <div className="text-3xl font-black text-slate-900 italic">TECHCORP</div>
          <div className="text-3xl font-black text-slate-900 italic">SYSTEMS</div>
          <div className="text-3xl font-black text-slate-900 italic">DEVFLOW</div>
          <div className="text-3xl font-black text-slate-900 italic">CLOUDNET</div>
        </div>
      </section>
    </div>
  );
};

export default LandingPage;
