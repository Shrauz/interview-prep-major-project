import React, { useState, useEffect, useMemo } from 'react';
import Layout from './components/Layout';
import LandingPage from './components/LandingPage';
import AuthPage from './components/AuthPage';
import SetupForm from './components/SetupForm';
import InterviewRoom from './components/InterviewRoom';
import FeedbackView from './components/FeedbackView';
import { InterviewSetup, InterviewSession } from './types';
import { generateQuestions, analyzeInterview } from './services/gemini';
import { 
  FileCode, ClipboardCheck, Trophy, Clock, 
  ChevronRight, Mic, Hash, Plus, Trash2, AlertCircle
} from 'lucide-react';

interface User {
  name: string;
  email: string;
}

const App: React.FC = () => {
  // --- STATE ---
  const [user, setUser] = useState<User | null>(null);
  const [view, setView] = useState<'landing' | 'auth' | 'app'>('landing');
  const [activeTab, setActiveTab] = useState<'dashboard' | 'generated' | 'feedback' | 'new'>('dashboard');
  const [currentSession, setCurrentSession] = useState<InterviewSession | null>(null);
  const [historyFeedbackSession, setHistoryFeedbackSession] = useState<InterviewSession | null>(null);
  const [isInterviewing, setIsInterviewing] = useState(false);
  const [sessions, setSessions] = useState<InterviewSession[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // --- BACKEND SYNC HELPERS ---

  // 1. Fetch all sessions for the logged-in user from Flask
  const fetchSessions = async () => {
    const token = localStorage.getItem('hireprep_token');
    if (!token) return;

    try {
      const response = await fetch('http://127.0.0.1:5000/api/sessions', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setSessions(data);
      }
    } catch (e) {
      console.error("Failed to load sessions from server:", e);
    }
  };

  // 2. Save or Update a single session in the Flask database
  const syncSessionToDb = async (sessionToSave: InterviewSession) => {
    const token = localStorage.getItem('hireprep_token');
    try {
      await fetch('http://127.0.0.1:5000/api/sessions', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(sessionToSave)
      });
    } catch (e) {
      console.error("Failed to sync session to database:", e);
    }
  };

  // --- EFFECTS ---

  // On Mount: Check if user is already logged in
  useEffect(() => {
    const savedUser = localStorage.getItem('hireprep_user');
    const token = localStorage.getItem('hireprep_token');
    
    if (savedUser && token) {
      setUser(JSON.parse(savedUser));
      setView('app');
      fetchSessions();
    }
  }, []);

  // --- HANDLERS ---

  const handleAuth = (newUser: User) => {
    setUser(newUser);
    localStorage.setItem('hireprep_user', JSON.stringify(newUser));
    // hireprep_token is already set inside AuthPage.tsx
    setView('app');
    fetchSessions(); // Load their data immediately after login
  };

  const handleLogout = () => {
    setUser(null);
    localStorage.removeItem('hireprep_user');
    localStorage.removeItem('hireprep_token');
    setView('landing');
    setSessions([]);
  };

  const deleteSession = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (window.confirm('Delete this interview? This cannot be undone.')) {
        // For now, we filter locally. 
        // Tip: You can add a DELETE route to Flask later to make this permanent!
        const updated = sessions.filter(s => s.id !== id);
        setSessions(updated);
        if (historyFeedbackSession?.id === id) setHistoryFeedbackSession(null);
    }
  };

const startNewInterview = async (setup: InterviewSetup) => {
    setIsLoading(true);
    try {
      console.log("Setup object being sent:", setup);
      // 1. Get the strings from your Flask backend
      const rawQuestions: string[] = await generateQuestions(setup);
      
      if (!rawQuestions || !Array.isArray(rawQuestions)) {
      throw new Error("Backend returned invalid questions format");
    }

      // 2. CONVERT strings to objects (This fixes the error!)
      const formattedQuestions = rawQuestions.map((qText:string, index:number) => ({
        id: `q-${Date.now()}-${index}`,
        text: qText,
      }));

      // 3. Create the session object using the formatted questions
      const newSession: InterviewSession = {
        id: Date.now().toString(),
        setup,
        questions: formattedQuestions, // Now the types match!
        transcript: [],
        status: 'ready',
        date: new Date().toISOString()
      };
      
      setSessions(prev => [newSession, ...prev]);
      await syncSessionToDb(newSession);
      setActiveTab('generated');

    } catch (e: any) {
      console.error(e);
      alert("Failed to generate questions. Is your Flask server running?");
    } finally {
      setIsLoading(false);
    }
  };

  const takeInterview = (session: InterviewSession) => {
    if (session.status === 'completed') {
      const newAttempt: InterviewSession = {
        ...session,
        id: Date.now().toString(),
        transcript: [],
        status: 'ready',
        feedback: undefined,
        date: new Date().toISOString(),
        parentSessionId: session.id
      };
      setSessions(prev => [newAttempt, ...prev]);
      setCurrentSession(newAttempt);
    } else {
      setCurrentSession(session);
    }
    setIsInterviewing(true);
  };

  const viewHistoryFeedback = (session: InterviewSession) => {
    setHistoryFeedbackSession(session);
    setActiveTab('feedback');
  };

  const handleInterviewComplete = async (session: InterviewSession) => {
    setIsInterviewing(false);
    
    // 1. Mark as completed locally
    const completedSession: InterviewSession = { ...session, status: 'completed' };
    setSessions(prev => prev.map(s => s.id === session.id ? completedSession : s));
    
    // 2. Sync 'completed' status to DB immediately
    await syncSessionToDb(completedSession);
    
    setActiveTab('feedback');
    setHistoryFeedbackSession(completedSession);

    try {
      // 3. Get AI Analysis from Flask
      const feedback = await analyzeInterview(completedSession);
      if (feedback) {
        const analyzedSession: InterviewSession = { ...completedSession, feedback };
        
        // 4. Update local UI with feedback
        setSessions(prev => prev.map(s => s.id === session.id ? analyzedSession : s));
        setHistoryFeedbackSession(analyzedSession);
        
        // 5. Save final analyzed session to DB
        await syncSessionToDb(analyzedSession);
      }
    } catch (error) {
      console.error("Feedback analysis failed", error);
    }
  };

  // --- DATA CALCULATIONS ---
  const metrics = useMemo(() => {
    const total = sessions.length;
    const completedArr = sessions.filter(s => s.status === 'completed');
    const attempted = completedArr.length;
    const scoredArr = completedArr.filter(s => s.feedback);
    const avgScore = scoredArr.length > 0 
      ? Math.round(scoredArr.reduce((acc, s) => acc + (s.feedback?.overallScore || 0), 0) / scoredArr.length)
      : 0;
    
    return { total, attempted, avgScore };
  }, [sessions]);

  // --- VIEW RENDERING ---

  if (view === 'landing') {
    return <LandingPage onGetStarted={() => setView('auth')} onLogin={() => setView('auth')} />;
  }

  if (view === 'auth') {
    return <AuthPage onAuth={handleAuth} onBack={() => setView('landing')} />;
  }

  if (isInterviewing && currentSession) {
    return (
      <div className="h-screen bg-slate-950 p-4">
        <InterviewRoom 
          setup={currentSession.setup} 
          questions={currentSession.questions}
          onComplete={handleInterviewComplete}
          onCancel={() => setIsInterviewing(false)}
        />
      </div>
    );
  }

  return (
    <Layout activeTab={activeTab} setActiveTab={setActiveTab} user={user} onLogout={handleLogout}>
      {isLoading ? (
         <div className="flex flex-col items-center justify-center h-full">
            <div className="w-20 h-20 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin"></div>
            <p className="mt-8 text-slate-500 font-black text-2xl animate-pulse text-center leading-tight">
              Crafting your personalized <br /> interview questions...
            </p>
         </div>
      ) : activeTab === 'new' ? (
        <SetupForm onStart={startNewInterview} />
      ) : activeTab === 'generated' ? (
        <div className="max-w-7xl mx-auto space-y-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-black text-slate-900 tracking-tight">Ready Sessions</h1>
              <p className="text-slate-500 font-medium text-lg">Saved templates waiting for your next practice.</p>
            </div>
            <button onClick={() => setActiveTab('new')} className="bg-indigo-600 text-white px-8 py-4 rounded-2xl font-black shadow-xl hover:bg-indigo-700 transition flex items-center gap-2">
              <Plus className="w-5 h-5" /> New Session
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10">
            {sessions.filter(s => s.status === 'ready').length === 0 ? (
              <div className="col-span-full bg-white p-24 rounded-[48px] border-2 border-dashed border-slate-200 text-center">
                <h3 className="text-2xl font-black text-slate-800">No sessions ready</h3>
                <p className="text-slate-500 mt-2 font-medium">Create a new interview setup to get started.</p>
                <button onClick={() => setActiveTab('new')} className="mt-8 bg-indigo-600 text-white px-8 py-4 rounded-xl font-bold">Start Now</button>
              </div>
            ) : (
              sessions.filter(s => s.status === 'ready').map(s => (
                <div key={s.id} className="bg-white rounded-[40px] border border-slate-100 shadow-sm overflow-hidden group hover:shadow-2xl transition-all duration-500 flex flex-col relative border-b-8 border-transparent hover:border-indigo-600">
                  <button 
                    onClick={(e) => deleteSession(s.id, e)}
                    className="absolute top-6 right-6 p-2 text-slate-300 hover:text-red-500 transition-colors z-10"
                  >
                    <Trash2 size={20} />
                  </button>
                  <div className="p-10 flex-1">
                    <div className="flex justify-between items-start mb-8 mr-8">
                      <div className="px-4 py-2 bg-indigo-50 text-indigo-600 rounded-xl text-[10px] font-black uppercase tracking-[0.2em]">
                        {s.setup.difficulty}
                      </div>
                      <div className="text-slate-400 text-[10px] font-black uppercase tracking-widest flex items-center gap-1.5">
                        <Clock size={14} />
                        {new Date(s.date).toLocaleDateString()}
                      </div>
                    </div>
                    <h3 className="text-2xl font-black text-slate-900 leading-tight mb-4 group-hover:text-indigo-600 transition">
                      {s.setup.jobTitle}
                    </h3>
                    <div className="flex items-center gap-2 text-slate-400 text-xs font-bold uppercase tracking-widest mb-4">
                      <Hash size={14} className="text-indigo-400" />
                      {s.questions.length} Questions
                    </div>
                  </div>
                  <div className="p-8 bg-slate-50/50 border-t border-slate-100">
                    <button 
                      onClick={() => takeInterview(s)}
                      className="w-full bg-indigo-600 text-white py-5 rounded-[22px] font-black hover:bg-indigo-700 transition flex items-center justify-center gap-3 shadow-xl shadow-indigo-600/20"
                    >
                      <Mic size={20} /> Start Interview
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      ) : activeTab === 'feedback' ? (
        <div className="max-w-7xl mx-auto space-y-8">
          {historyFeedbackSession ? (
            <FeedbackView session={historyFeedbackSession} onBack={() => setHistoryFeedbackSession(null)} />
          ) : (
            <>
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div>
                  <h1 className="text-4xl font-black text-slate-900 tracking-tight">Performance History</h1>
                  <p className="text-slate-500 font-medium text-lg">A record of your past attempts and AI feedback.</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10">
                 {sessions.filter(s => s.status === 'completed').length === 0 ? (
                    <div className="col-span-full bg-white p-24 rounded-[48px] border-2 border-dashed border-slate-200 text-center">
                       <h3 className="text-2xl font-black text-slate-800">No attempts yet</h3>
                       <p className="text-slate-500 mt-2 font-medium">Feedback will appear here once you finish an interview.</p>
                    </div>
                 ) : (
                   sessions.filter(s => s.status === 'completed').map(s => (
                    <div key={s.id} className="bg-white rounded-[40px] border border-slate-100 shadow-sm overflow-hidden group hover:shadow-2xl transition-all duration-500 flex flex-col relative border-b-8 border-transparent hover:border-emerald-500">
                       <button 
                          onClick={(e) => deleteSession(s.id, e)}
                          className="absolute top-6 right-6 p-2 text-slate-300 hover:text-red-500 transition-colors z-10"
                        >
                          <Trash2 size={20} />
                        </button>
                       <div className="p-10 flex-1">
                        <div className="flex justify-between items-start mb-8 mr-8">
                           <div className="relative w-16 h-16">
                              <svg className="w-16 h-16 -rotate-90">
                                <circle cx="32" cy="32" r="28" fill="transparent" stroke="#f1f5f9" strokeWidth="5" />
                                <circle 
                                  cx="32" cy="32" r="28" fill="transparent" stroke={s.feedback ? "#10b981" : "#cbd5e1"} strokeWidth="5" 
                                  strokeDasharray={`${2 * Math.PI * 28}`}
                                  strokeDashoffset={`${2 * Math.PI * 28 * (1 - (s.feedback?.overallScore || 0) / 100)}`}
                                  className="transition-all duration-1000"
                                />
                              </svg>
                              <div className="absolute inset-0 flex items-center justify-center font-black text-slate-900 text-sm">
                                {s.feedback?.overallScore || '...'}
                              </div>
                           </div>
                           <div className="text-right">
                             <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest">{new Date(s.date).toLocaleDateString()}</p>
                             <p className="text-[10px] font-black text-indigo-600 uppercase tracking-widest mt-1.5">{s.setup.difficulty}</p>
                           </div>
                        </div>
                        <h3 className="text-2xl font-black text-slate-900 leading-tight mb-4 group-hover:text-emerald-600 transition">
                          {s.setup.jobTitle}
                        </h3>
                        <p className="text-sm text-slate-600 font-medium line-clamp-2 italic">"{s.feedback?.strengths[0] || 'Analyzing performance...'}"</p>
                      </div>
                      <div className="p-8 bg-slate-50/50 border-t border-slate-100 flex gap-4">
                        <button 
                          onClick={() => viewHistoryFeedback(s)}
                          className="flex-1 bg-white border border-slate-200 text-slate-800 py-4 rounded-[20px] font-black text-xs hover:bg-slate-100 transition uppercase tracking-widest"
                        >
                          Results
                        </button>
                        <button 
                          onClick={() => takeInterview(s)}
                          className="flex-1 bg-indigo-600 text-white py-4 rounded-[20px] font-black text-xs hover:bg-indigo-700 transition uppercase tracking-widest"
                        >
                          Retake
                        </button>
                      </div>
                    </div>
                   ))
                 )}
              </div>
            </>
          )}
        </div>
      ) : (
        <div className="space-y-16">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
            <div>
              <h1 className="text-6xl font-black text-slate-900 tracking-tighter leading-none">Dashboard</h1>
              <p className="text-slate-500 mt-4 font-medium text-xl">Welcome back, {user?.name.split(' ')[0]}. Here is your current progress.</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
            <div className="bg-white p-12 rounded-[56px] shadow-sm border border-slate-100 relative overflow-hidden">
              <div className="relative z-10">
                <div className="w-16 h-16 bg-indigo-50 text-indigo-600 rounded-[24px] flex items-center justify-center mb-8">
                  <FileCode size={32} />
                </div>
                <p className="text-slate-400 text-[11px] font-black uppercase tracking-[0.25em] mb-3">Saved Mocks</p>
                <p className="text-6xl font-black text-slate-900 tracking-tight">{metrics.total}</p>
              </div>
            </div>

            <div className="bg-white p-12 rounded-[56px] shadow-sm border border-slate-100 relative overflow-hidden">
              <div className="relative z-10">
                <div className="w-16 h-16 bg-emerald-50 text-emerald-600 rounded-[24px] flex items-center justify-center mb-8">
                  <ClipboardCheck size={32} />
                </div>
                <p className="text-slate-400 text-[11px] font-black uppercase tracking-[0.25em] mb-3">Completed Attempts</p>
                <p className="text-6xl font-black text-slate-900 tracking-tight">{metrics.attempted}</p>
              </div>
            </div>

            <div className="bg-indigo-600 p-12 rounded-[56px] shadow-2xl text-white relative overflow-hidden">
              <div className="relative z-10">
                <div className="w-16 h-16 bg-white/20 rounded-[24px] flex items-center justify-center mb-8 backdrop-blur-md">
                  <Trophy size={32} />
                </div>
                <p className="text-white/60 text-[11px] font-black uppercase tracking-[0.25em] mb-3">Average Performance</p>
                <p className="text-6xl font-black tracking-tight">{metrics.avgScore}%</p>
              </div>
            </div>
          </div>

          <div className="space-y-10">
             <div className="flex items-center justify-between">
               <h2 className="text-4xl font-black text-slate-900 tracking-tight">Recent Sessions</h2>
               <button onClick={() => setActiveTab('feedback')} className="text-indigo-600 font-black hover:underline flex items-center gap-2 text-xl group">
                 View All <ChevronRight size={24} className="group-hover:translate-x-1 transition" />
               </button>
             </div>

             {sessions.length === 0 ? (
               <div className="bg-white border-2 border-dashed border-slate-200 rounded-[56px] p-24 text-center">
                  <h3 className="text-3xl font-black text-slate-800 tracking-tight">Your practice starts here</h3>
                  <p className="text-slate-500 mt-6 font-medium max-w-lg mx-auto text-xl leading-relaxed">Customize your first interview session and get AI feedback.</p>
                  <button 
                    onClick={() => setActiveTab('new')}
                    className="mt-12 bg-indigo-600 text-white px-14 py-6 rounded-[28px] font-black shadow-2xl text-lg hover:bg-indigo-700 transition"
                  >
                    Setup First Mock
                  </button>
               </div>
             ) : (
               <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-12">
                 {sessions.slice(0, 3).map(session => (
                   <div key={session.id} className="bg-white rounded-[48px] border border-slate-100 shadow-sm overflow-hidden group hover:shadow-2xl transition-all duration-700 flex flex-col relative">
                     <button 
                        onClick={(e) => deleteSession(session.id, e)}
                        className="absolute top-6 right-6 p-2 text-slate-300 hover:text-red-500 transition-colors z-10 opacity-0 group-hover:opacity-100"
                      >
                        <Trash2 size={20} />
                      </button>
                     <div className="p-12 flex-1">
                       <div className="flex justify-between items-start mb-10 mr-8">
                         <div className={`px-6 py-2.5 rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-sm ${session.status === 'completed' ? 'bg-indigo-50 text-indigo-600' : 'bg-amber-50 text-amber-600'}`}>
                           {session.status === 'completed' ? 'Completed' : 'Upcoming'}
                         </div>
                         <div className="text-slate-400 text-[10px] font-black uppercase tracking-[0.2em] flex items-center gap-2">
                           <Clock size={16} />
                           {new Date(session.date).toLocaleDateString()}
                         </div>
                       </div>
                       <h3 className="text-3xl font-black text-slate-900 leading-tight mb-8 group-hover:text-indigo-600 transition">
                         {session.setup.jobTitle}
                       </h3>
                       <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                          <div className="h-full bg-indigo-600 rounded-full transition-all duration-1000" style={{ width: session.status === 'completed' ? `${session.feedback?.overallScore || 0}%` : '5%' }}></div>
                       </div>
                     </div>
                     <div className="bg-slate-50/50 p-10 border-t border-slate-100/50 backdrop-blur-sm">
                        {session.status === 'completed' ? (
                          <button 
                            onClick={() => viewHistoryFeedback(session)}
                            className="w-full text-sm font-black text-indigo-600 hover:text-indigo-800 uppercase tracking-widest transition"
                          >
                            View Performance Results
                          </button>
                        ) : (
                          <button 
                            onClick={() => takeInterview(session)}
                            className="w-full text-sm font-black bg-indigo-600 text-white shadow-2xl py-6 rounded-[24px] transition flex items-center justify-center gap-4 hover:bg-indigo-700"
                          >
                            <Mic size={22} /> Enter Session
                          </button>
                        )}
                     </div>
                   </div>
                 ))}
               </div>
             )}
          </div>
        </div>
      )}
    </Layout>
  );
};

export default App;