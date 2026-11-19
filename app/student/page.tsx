'use client';
import { useState, useEffect } from 'react';
import { Html5QrcodeScanner } from 'html5-qrcode';
import { supabase } from '@/lib/supabase';

export default function StudentPage() {
  const [name, setName] = useState('');
  const [rollNo, setRollNo] = useState('');
  const [readyToScan, setReadyToScan] = useState(false);
  const [status, setStatus] = useState('');

  useEffect(() => {
    if (!readyToScan) return;

    const scanner = new Html5QrcodeScanner('reader', { fps: 10, qrbox: 250 }, false);

    scanner.render(async (decodedText) => {
      scanner.clear();
      setReadyToScan(false);
      setStatus('Verifying QR code...');

      const { data: session } = await supabase
        .from('sessions')
        .select('*')
        .eq('secret_code', decodedText.trim())
        .eq('is_active', true)
        .single();

      if (!session) {
        return setStatus('❌ Invalid or expired class QR code!');
      }

      const { error } = await supabase.from('attendance').insert([
        { session_id: session.id, student_name: name, roll_no: rollNo.toUpperCase() }
      ]);

      if (error) {
        if (error.code === '23505') return setStatus('⚠️ Attendance already marked for this class!');
        return setStatus(`❌ Error: ${error.message}`);
      }

      setStatus(`✅ Marked Present for ${session.subject_name}!`);
    }, () => {});

    return () => { scanner.clear().catch(() => {}); };
  }, [readyToScan, name, rollNo]);

  return (
    <main className="min-h-screen bg-slate-950 text-white p-6 flex flex-col items-center">
      <h1 className="text-2xl font-bold mb-6">Student Check-In</h1>

      {!readyToScan ? (
        <div className="w-full max-w-md bg-slate-900 p-6 rounded-2xl border border-slate-800 space-y-4">
          <input
            type="text"
            placeholder="Your Full Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full p-3 rounded-lg bg-slate-800 border border-slate-700"
          />
          <input
            type="text"
            placeholder="College Roll Number (e.g., 22A91A0501)"
            value={rollNo}
            onChange={(e) => setRollNo(e.target.value)}
            className="w-full p-3 rounded-lg bg-slate-800 border border-slate-700 uppercase"
          />
          <button
            onClick={() => {
              if (!name || !rollNo) return alert('Enter both Name and Roll Number!');
              setStatus('');
              setReadyToScan(true);
            }}
            className="w-full bg-emerald-600 hover:bg-emerald-500 py-3 rounded-lg font-semibold"
          >
            Open Camera to Scan QR
          </button>
          {status && <p className="text-center font-medium pt-2">{status}</p>}
        </div>
      ) : (
        <div className="w-full max-w-md bg-white text-black p-4 rounded-2xl">
          <div id="reader" className="w-full"></div>
          <button onClick={() => setReadyToScan(false)} className="mt-4 w-full bg-slate-800 text-white py-2 rounded-lg">
            Cancel
          </button>
        </div>
      )}
    </main>
  );
}