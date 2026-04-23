
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { GoogleGenAI, Modality } from '@google/genai';
import { InterviewSession, InterviewSetup, InterviewQuestion, Persona } from '../types';
import { decode, decodeAudioData, createPcmBlob } from '../lib/audio-utils';
import { Mic, MicOff, PhoneOff, User, ChevronRight, Hash, Briefcase, Gauge, List, Timer } from 'lucide-react';

interface InterviewRoomProps {
  setup: InterviewSetup;
  questions: InterviewQuestion[];
  onComplete: (session: InterviewSession) => void;
  onCancel: () => void;
}

const personaConfigs: Record<Persona, { instruction: string; voice: string }> = {
  Friendly: {
    instruction: "You are a friendly, encouraging, and patient interviewer. You provide warm affirmations and use a supportive tone.",
    voice: "Zephyr"
  },
  Direct: {
    instruction: "You are a direct, no-nonsense interviewer. You value brevity and get straight to the point. You don't waste time on pleasantries.",
    voice: "Fenrir"
  },
  Technical: {
    instruction: "You are a highly technical expert. You dive deep into technical details, ask challenging follow-up questions, and maintain a rigorous professional distance.",
    voice: "Puck"
  }
};

const InterviewRoom: React.FC<InterviewRoomProps> = ({ setup, questions, onComplete, onCancel }) => {
  const [isLive, setIsLive] = useState(false);
  const [status, setStatus] = useState<'connecting' | 'active' | 'finished'>('connecting');
  const [transcript, setTranscript] = useState<string[]>([]);
  const [currentPrompt, setCurrentPrompt] = useState<string>("Initializing interviewer...");
  const [currentQuestionIdx, setCurrentQuestionIdx] = useState(0);
  const [seconds, setSeconds] = useState(0);
  const [showTranscript, setShowTranscript] = useState(false);
  
  const sessionRef = useRef<any>(null);
  const audioContextRef = useRef<{ input: AudioContext; output: AudioContext } | null>(null);
  const nextStartTimeRef = useRef<number>(0);
  const sourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());
  const transcriptBufferRef = useRef<{ user: string; model: string }>({ user: '', model: '' });
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    if (status === 'active') {
      timerRef.current = window.setInterval(() => {
        setSeconds(s => s + 1);
      }, 1000);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [status]);

  const stopSession = useCallback(() => {
    if (sessionRef.current) {
      sessionRef.current.close();
      sessionRef.current = null;
    }
    if (audioContextRef.current) {
      audioContextRef.current.input.close();
      audioContextRef.current.output.close();
    }
    setIsLive(false);
  }, []);

  const startSession = useCallback(async () => {
    const ai = new GoogleGenAI({ apiKey: "AIzaSyBbpYkAbRj3fHC4qG7AWkuGz8MIh3n_HiU" });
    
    const inputAudioContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
    const outputAudioContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
    audioContextRef.current = { input: inputAudioContext, output: outputAudioContext };

    const persona = personaConfigs[setup.persona];

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      const sessionPromise = ai.live.connect({
        model: 'gemini-2.5-flash-native-audio-preview-12-2025',
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: { prebuiltVoiceConfig: { voiceName: persona.voice } },
          },
          systemInstruction: `${persona.instruction} 
          You are interviewing for a ${setup.jobTitle} position (${setup.difficulty} level). 
          The candidate has ${setup.yearsOfExperience} years of experience with ${setup.techStack}.
          Your goal is to interview them using these prepared questions: ${questions.map((q, i) => `[Question ${i+1}]: ${q.text}`).join('; ')}.
          IMPORTANT: You MUST explicitly say "[Question X]" before asking each question so the system can track progress.
          Ask exactly one question at a time. After the candidate answers, briefly acknowledge and move to the next question. 
          The interview ends after you have asked all ${questions.length} questions.`,
          outputAudioTranscription: {},
          inputAudioTranscription: {},
        },
        callbacks: {
          onopen: () => {
            setStatus('active');
            setIsLive(true);
            setCurrentPrompt("Interviewer is ready. Say 'Hello' or 'Let's start' to begin.");
            
            const source = inputAudioContext.createMediaStreamSource(stream);
            const scriptProcessor = inputAudioContext.createScriptProcessor(4096, 1, 1);
            scriptProcessor.onaudioprocess = (e) => {
              const inputData = e.inputBuffer.getChannelData(0);
              const pcmBlob = createPcmBlob(inputData);
              sessionPromise.then((session) => {
                session.sendRealtimeInput({ media: pcmBlob });
              });
            };
            source.connect(scriptProcessor);
            scriptProcessor.connect(inputAudioContext.destination);
          },
          onmessage: async (message) => {
            const audioData = message.serverContent?.modelTurn?.parts[0]?.inlineData?.data;
            if (audioData) {
              const ctx = outputAudioContext;
              nextStartTimeRef.current = Math.max(nextStartTimeRef.current, ctx.currentTime);
              const buffer = await decodeAudioData(decode(audioData), ctx, 24000, 1);
              const source = ctx.createBufferSource();
              source.buffer = buffer;
              source.connect(ctx.destination);
              source.addEventListener('ended', () => sourcesRef.current.delete(source));
              source.start(nextStartTimeRef.current);
              nextStartTimeRef.current += buffer.duration;
              sourcesRef.current.add(source);
            }

            if (message.serverContent?.interrupted) {
              sourcesRef.current.forEach(s => s.stop());
              sourcesRef.current.clear();
              nextStartTimeRef.current = 0;
            }

            if (message.serverContent?.inputTranscription) {
              transcriptBufferRef.current.user += message.serverContent.inputTranscription.text;
            }
            if (message.serverContent?.outputTranscription) {
              const text = message.serverContent.outputTranscription.text;
              transcriptBufferRef.current.model += text;
              setCurrentPrompt(transcriptBufferRef.current.model.slice(-120));
              
              const match = text.match(/\[Question (\d+)\]/i);
              if (match) {
                setCurrentQuestionIdx(parseInt(match[1]) - 1);
              }
            }

            if (message.serverContent?.turnComplete) {
              const u = transcriptBufferRef.current.user;
              const m = transcriptBufferRef.current.model;
              if (u || m) {
                setTranscript(prev => [...prev, `Candidate: ${u}`, `Interviewer: ${m}`]);
              }
              transcriptBufferRef.current = { user: '', model: '' };
            }
          },
          onclose: () => setIsLive(false),
          onerror: (e) => console.error("Live API Error", e)
        }
      });

      sessionRef.current = await sessionPromise;
    } catch (err) {
      console.error("Microphone access or Connection error", err);
      onCancel();
    }
  }, [setup, questions, onCancel]);

  useEffect(() => {
    startSession();
    return () => stopSession();
  }, []);

  const formatTime = (s: number) => {
    const mins = Math.floor(s / 60);
    const secs = s % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleFinish = () => {
    stopSession();
    const session: InterviewSession = {
      id: Date.now().toString(),
      setup,
      questions,
      transcript,
      status: 'completed',
      date: new Date().toISOString()
    };
    onComplete(session);
  };

  return (
    <div className="flex flex-col h-full bg-slate-900 rounded-3xl overflow-hidden shadow-2xl relative">
      <div className="bg-slate-800/80 backdrop-blur-md p-6 border-b border-slate-700 flex justify-between items-center z-20">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center font-bold text-white shadow-lg">H</div>
          <div>
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></span>
              Live Session
            </h2>
            <div className="flex items-center gap-3">
              <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest">{setup.persona} Persona</p>
              <div className="w-1 h-1 bg-slate-600 rounded-full"></div>
              <div className="flex items-center gap-1 text-slate-400 text-[10px] font-black uppercase tracking-widest">
                <Timer size={12} className="text-indigo-400" />
                {formatTime(seconds)}
              </div>
            </div>
          </div>
        </div>
        
        <div className="flex items-center gap-6">
          <button 
            onClick={() => setShowTranscript(!showTranscript)}
            className={`p-3 rounded-xl transition-colors ${showTranscript ? 'bg-indigo-600 text-white' : 'bg-slate-700 text-slate-300 hover:bg-slate-600'}`}
            title="Toggle Transcript"
          >
            <List size={20} />
          </button>
          <div className="flex flex-col items-end">
            <span className="text-[10px] text-slate-500 font-black uppercase tracking-widest">Questions</span>
            <div className="text-white font-black text-lg flex items-center gap-2">
              <Hash size={16} className="text-indigo-400" />
              {Math.min(currentQuestionIdx + 1, questions.length)} of {questions.length}
            </div>
          </div>
          <button 
            onClick={handleFinish}
            className="bg-red-600 hover:bg-red-700 text-white px-6 py-3 rounded-xl font-black transition flex items-center gap-2 shadow-lg shadow-red-900/20 active:scale-95"
          >
            <PhoneOff size={18} />
            End Now
          </button>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Main Interaction Area */}
        <div className="flex-1 flex flex-col items-center justify-center p-8 relative overflow-hidden">
          <div className="relative z-10 w-full max-w-2xl flex flex-col items-center">
            <div className={`w-64 h-64 rounded-full flex items-center justify-center transition-all duration-700 ${isLive ? 'bg-indigo-600/10 shadow-[0_0_150px_rgba(79,70,229,0.15)]' : 'bg-slate-800'}`}>
              <div className={`w-48 h-48 rounded-full bg-indigo-500 flex items-center justify-center text-white shadow-2xl transition-transform duration-500 overflow-hidden relative ${isLive ? 'scale-110' : 'scale-100'}`}>
                {isLive ? (
                  <>
                    <div className="flex items-end gap-2 h-14">
                      <div className="w-2 bg-white/90 rounded-full animate-[bounce_1s_infinite_0ms]" style={{height: '60%'}}></div>
                      <div className="w-2 bg-white/90 rounded-full animate-[bounce_1s_infinite_200ms]" style={{height: '100%'}}></div>
                      <div className="w-2 bg-white/90 rounded-full animate-[bounce_1s_infinite_400ms]" style={{height: '80%'}}></div>
                      <div className="w-2 bg-white/90 rounded-full animate-[bounce_1s_infinite_600ms]" style={{height: '50%'}}></div>
                    </div>
                    {/* Pulsing ring */}
                    <div className="absolute inset-0 border-4 border-white/20 rounded-full animate-ping"></div>
                  </>
                ) : <MicOff size={56} />}
              </div>
            </div>
            
            <div className="mt-16 w-full text-center space-y-8">
               <div className="relative p-8 rounded-[40px] bg-slate-800/60 border border-slate-700 min-h-[140px] flex items-center justify-center shadow-inner backdrop-blur-sm">
                 <p className="text-slate-100 font-bold italic text-xl leading-relaxed max-w-lg">
                  "{status === 'active' ? currentPrompt : 'Connecting to AI Interviewer...'}"
                 </p>
                 <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-indigo-600 px-4 py-1.5 rounded-full text-[10px] font-black text-white uppercase tracking-[0.2em] shadow-lg">
                   Live Feed
                 </div>
               </div>
            </div>
          </div>
          
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[1000px] h-[1000px] bg-indigo-500/5 blur-[200px] rounded-full animate-pulse pointer-events-none"></div>
        </div>

        {/* Live Transcript Sidebar */}
        {showTranscript && (
          <div className="w-96 bg-slate-800/50 backdrop-blur-xl border-l border-slate-700 flex flex-col animate-in slide-in-from-right duration-300">
            <div className="p-6 border-b border-slate-700 flex items-center justify-between">
              <h3 className="text-white font-black uppercase tracking-widest text-xs">Live Transcript</h3>
              <div className="px-3 py-1 bg-emerald-500/20 text-emerald-400 rounded-full text-[10px] font-black uppercase tracking-widest">Recording</div>
            </div>
            <div className="flex-1 overflow-y-auto p-6 space-y-6 scrollbar-thin scrollbar-thumb-slate-700">
              {transcript.length === 0 && (
                <p className="text-slate-500 text-sm italic text-center mt-10">Waiting for conversation...</p>
              )}
              {transcript.map((msg, i) => {
                const isModel = msg.startsWith('Interviewer:');
                return (
                  <div key={i} className={`flex flex-col ${isModel ? 'items-start' : 'items-end'}`}>
                    <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">
                      {isModel ? 'Interviewer' : 'You'}
                    </span>
                    <div className={`max-w-[85%] p-4 rounded-2xl text-sm font-medium ${isModel ? 'bg-slate-700 text-slate-100 rounded-tl-none' : 'bg-indigo-600 text-white rounded-tr-none'}`}>
                      {msg.replace(/^(Interviewer:|Candidate:)\s*/, '')}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      <div className="bg-slate-800/80 p-6 border-t border-slate-700 flex items-center justify-center gap-8 backdrop-blur-md">
        <div className="flex items-center gap-2 text-slate-400">
          <Briefcase size={16} />
          <span className="text-xs font-black uppercase tracking-wider">{setup.jobTitle}</span>
        </div>
        <div className="w-1.5 h-1.5 bg-slate-600 rounded-full"></div>
        <div className="flex items-center gap-2 text-slate-400">
          <Gauge size={16} />
          <span className="text-xs font-black uppercase tracking-wider">{setup.difficulty} level</span>
        </div>
      </div>
    </div>
  );
};

export default InterviewRoom;
