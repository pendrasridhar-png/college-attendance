'use client';
import { useState, useEffect } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { supabase } from '@/lib/supabase';

export default function TeacherPage() {
  const [subject, setSubject] = useState('');
  const [session, setSession] = useState<any>(null);
  const [attendees, setAttendees] = useState<any[]>([]);

  const startSession = async () => {
    if (!subject.trim()) return alert('Enter a subject name!');
    const code = Math.random().toString(36).substring(2, 8).toUpperCase();
    
    const { data, error } = await supabase
      .from('sessions')
      .insert([{ subject_name: subject, secret_code: code, is_active: true }])
      .select()
      .single();

    if (error) return alert(error.message);
    setSession(data);
    setAttendees([]);
  };

  const endSession = async () => {
    if (!session) return;
    await supabase.from('sessions').update({ is_active: false }).eq('id', session.id);
    setSession(null);
  };

  useEffect(() => {
    if (!session) return;
    const channel = supabase
      .channel('live-attendance')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'attendance',
        filter: `session_id=eq.${session.id}`,
      }, (payload) => {
        setAttendees((prev) => [payload.new, ...prev]);
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [session]);

  return (
    <main className="min-h-screen bg-slate-950 text-white p-6 flex flex-col items-center">
      <h1 className="text-2xl font-bold mb-6">Professor Live Dashboard</h1>

      {!session ? (
        <div className="w-full max-w-md bg-slate-900 p-6 rounded-2xl border border-slate-800">
          <label className="block text-sm text-slate-400 mb-2">Subject Name / Code</label>
          <input
            type="text"
            placeholder="e.g., Data Structures (CS301)"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            className="w-full p-3 rounded-lg bg-slate-800 border border-slate-700 mb-4 text-white"
          />
          <button onClick={startSession} className="w-full bg-blue-600 hover:bg-blue-500 py-3 rounded-lg font-semibold">
            Generate Live QR Code
          </button>
        </div>
      ) : (
        <div className="w-full max-w-2xl grid md:grid-cols-2 gap-6">
          <div className="bg-white text-slate-900 p-6 rounded-2xl flex flex-col items-center justify-center">
            <h2 className="font-bold text-lg mb-1">{session.subject_name}</h2>
            <p className="text-xs text-slate-500 mb-4">Scan with Student Portal</p>
            <QRCodeSVG value={session.secret_code} size={200} />
            <p className="mt-4 font-mono text-xl font-bold tracking-widest">{session.secret_code}</p>
            <button onClick={endSession} className="mt-6 w-full bg-red-600 text-white py-2 rounded-lg font-semibold">
              End Class Session
            </button>
          </div>

          <div className="bg-slate-900 p-6 rounded-2xl border border-slate-800">
            <h2 className="font-bold text-lg mb-4">Live Present ({attendees.length})</h2>
            <div className="space-y-2 max-h-80 overflow-y-auto">
              {attendees.length === 0 && <p className="text-slate-500 text-sm">Waiting for students to scan...</p>}
              {attendees.map((s) => (
                <div key={s.id} className="bg-slate-800 p-3 rounded-lg flex justify-between items-center">
                  <span className="font-medium">{s.student_name}</span>
                  <span className="text-xs bg-emerald-500/20 text-emerald-400 px-2 py-1 rounded">{s.roll_no}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </main>
  );
}