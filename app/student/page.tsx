'use client';
import { useState, useEffect } from 'react';
import { Html5QrcodeScanner } from 'html5-qrcode';
import { supabase } from '@/lib/supabase';

function base64ToBuffer(base64: string) {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes.buffer;
}

export default function StudentPage() {
  const [rollNo, setRollNo] = useState('');
  const [studentProfile, setStudentProfile] = useState<any>(null);
  const [readyToScan, setReadyToScan] = useState(false);
  const [status, setStatus] = useState('');

  useEffect(() => {
    const saved = localStorage.getItem('registered_roll');
    if (saved) setRollNo(saved);
  }, []);

  const verifyBiometrics = async () => {
    if (!rollNo.trim()) return alert('Enter your registered Roll Number!');
    setStatus('Checking registration...');

    const { data: student, error } = await supabase
      .from('students')
      .select('*')
      .eq('roll_no', rollNo.toUpperCase().trim())
      .single();

    if (error || !student) {
      return setStatus('❌ Roll Number not registered! Complete Student Registration first.');
    }

    try {
      setStatus('👆 Scan your Fingerprint or Face ID to verify identity...');
      const challenge = crypto.getRandomValues(new Uint8Array(32));

      const assertion = await navigator.credentials.get({
        publicKey: {
          challenge,
          allowCredentials: [
            {
              id: base64ToBuffer(student.credential_id),
              type: 'public-key',
              transports: ['internal'],
            },
          ],
          userVerification: 'required',
          timeout: 60000,
        },
      });

      if (!assertion) return setStatus('❌ Biometric verification cancelled.');

      setStudentProfile(student);
      setStatus('');
      setReadyToScan(true);
    } catch (err: any) {
      setStatus(`❌ Biometric verification failed: ${err?.message || 'Try again'}`);
    }
  };

  useEffect(() => {
    if (!readyToScan || !studentProfile) return;

    const scanner = new Html5QrcodeScanner('reader', { fps: 10, qrbox: 250 }, false);

    scanner.render(async (decodedText) => {
      scanner.clear();
      setReadyToScan(false);
      setStatus('Marking attendance...');

      let code = decodedText.trim();
      try {
        const parsed = JSON.parse(code);
        if (parsed.code) code = parsed.code;
      } catch {}

      const { data: session } = await supabase
        .from('sessions')
        .select('*')
        .eq('secret_code', code)
        .eq('is_active', true)
        .single();

      if (!session) {
        return setStatus('❌ Invalid or expired class QR code!');
      }

      const { error } = await supabase.from('attendance').insert([
        {
          session_id: session.id,
          student_name: studentProfile.student_name,
          roll_no: studentProfile.roll_no,
        },
      ]);

      if (error) {
        if (error.code === '23505') return setStatus('⚠️ Attendance already marked for this class!');
        return setStatus(`❌ Error: ${error.message}`);
      }

      setStatus(`✅ Biometric Verified & Marked Present for ${session.subject_name}!`);
    }, () => {});

    return () => {
      scanner.clear().catch(() => {});
    };
  }, [readyToScan, studentProfile]);

  return (
    <main className="min-h-screen bg-slate-950 text-white p-6 flex flex-col items-center">
      <h1 className="text-2xl font-bold mb-6">Biometric Attendance Check-In</h1>

      {!readyToScan ? (
        <div className="w-full max-w-md bg-slate-900 p-6 rounded-2xl border border-slate-800 space-y-4">
          <input
            type="text"
            placeholder="Enter Registered Roll Number"
            value={rollNo}
            onChange={(e) => setRollNo(e.target.value)}
            className="w-full p-3 rounded-lg bg-slate-800 border border-slate-700 uppercase"
          />
          <button
            onClick={verifyBiometrics}
            className="w-full bg-emerald-600 hover:bg-emerald-500 py-3 rounded-lg font-semibold"
          >
            👆 Verify Fingerprint / Face ID & Scan QR
          </button>
          {status && <p className="text-center font-medium pt-2">{status}</p>}
        </div>
      ) : (
        <div className="w-full max-w-md bg-white text-black p-4 rounded-2xl">
          <div className="flex items-center gap-3 mb-3">
            {studentProfile?.photo_url && (
              <img src={studentProfile.photo_url} alt="Verified" className="w-12 h-12 rounded-full object-cover" />
            )}
            <div>
              <p className="font-bold">{studentProfile?.student_name}</p>
              <p className="text-xs text-emerald-600 font-semibold">✅ Biometric Verified ({studentProfile?.roll_no})</p>
            </div>
          </div>
          <div id="reader" className="w-full"></div>
          <button onClick={() => setReadyToScan(false)} className="mt-4 w-full bg-slate-800 text-white py-2 rounded-lg">
            Cancel
          </button>
        </div>
      )}
    </main>
  );
}
