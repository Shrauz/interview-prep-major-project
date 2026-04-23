
import React from 'react';
import { LayoutDashboard, FileCode, ClipboardCheck, Plus, LogOut, User } from 'lucide-react';

interface LayoutProps {
  children: React.ReactNode;
  activeTab: 'dashboard' | 'generated' | 'feedback' | 'new';
  setActiveTab: (tab: 'dashboard' | 'generated' | 'feedback' | 'new') => void;
  user: { name: string; email: string } | null;
  onLogout: () => void;
}

const Layout: React.FC<LayoutProps> = ({ children, activeTab, setActiveTab, user, onLogout }) => {
  return (
    <div className="flex h-screen bg-slate-50">
      {/* Sidebar */}
      <aside className="w-72 bg-slate-900 text-slate-300 flex flex-col p-6 space-y-8 shadow-2xl z-20">
        <div className="flex items-center gap-3 text-white px-2">
          <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center font-bold text-xl italic shadow-lg shadow-indigo-500/20">H</div>
          <span className="text-2xl font-black tracking-tighter">HirePrep AI</span>
        </div>

        <nav className="flex-1 space-y-1.5">
          <button 
            onClick={() => setActiveTab('dashboard')}
            className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-xl transition-all duration-200 font-bold text-sm ${activeTab === 'dashboard' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20' : 'hover:bg-slate-800 hover:text-white'}`}
          >
            <LayoutDashboard size={18} /> Dashboard
          </button>
          <button 
            onClick={() => setActiveTab('generated')}
            className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-xl transition-all duration-200 font-bold text-sm ${activeTab === 'generated' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20' : 'hover:bg-slate-800 hover:text-white'}`}
          >
            <FileCode size={18} /> Generated Interviews
          </button>
          <button 
            onClick={() => setActiveTab('feedback')}
            className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-xl transition-all duration-200 font-bold text-sm ${activeTab === 'feedback' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20' : 'hover:bg-slate-800 hover:text-white'}`}
          >
            <ClipboardCheck size={18} /> Previous Feedback
          </button>
        </nav>

        {/* User Profile Area */}
        <div className="space-y-4">
          <div className="p-4 bg-slate-800/50 rounded-2xl border border-slate-700/50 backdrop-blur-sm">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-indigo-500/20 rounded-full flex items-center justify-center text-indigo-400 shadow-inner">
                <User size={20} />
              </div>
              <div className="overflow-hidden">
                <p className="text-sm font-bold text-white truncate">{user?.name}</p>
                <p className="text-[10px] text-slate-400 font-black truncate tracking-widest uppercase">{user?.email}</p>
              </div>
            </div>
            <button 
              onClick={onLogout}
              className="w-full flex items-center justify-center gap-2 text-xs font-black text-slate-500 hover:text-red-400 transition-colors py-2"
            >
              <LogOut size={14} /> Log Out
            </button>
          </div>

          <button 
            onClick={() => setActiveTab('new')}
            className="w-full bg-white text-slate-900 hover:bg-indigo-50 p-4 rounded-2xl transition-all duration-300 flex items-center justify-center gap-2 font-black text-sm shadow-xl hover:shadow-indigo-500/10 active:scale-95 border border-white"
          >
            <Plus size={18} /> Create New Mock
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto p-12 bg-[#fcfdfe]">
        {children}
      </main>
    </div>
  );
};

export default Layout;
