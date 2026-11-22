'use client';
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

function base64ToBuffer(base64: string) {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes.buffer;
}

export default function StudentDashboardPage() {
  const [rollNo, setRollNo] = useState('');
  const [studentProfile, setStudentProfile] = useState<any>(null);
  const [records, setRecords] = useState<any[]>([]);
  const [status, setStatus] = useState('');
  const [markedToday, setMarkedToday] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem('registered_roll');
    if (saved) setRollNo(saved);
  }, []);

  const loadAttendance = async (cleanRoll: string) => {
    const { data } = await supabase
      .from('daily_attendance')
      .select('*')
      .eq('roll_no', cleanRoll)
      .order('attendance_date', { ascending: false });

    const list = data || [];
    setRecords(list);

    const todayStr = new Date().toISOString().slice(0, 10);
    setMarkedToday(list.some((r) => r.attendance_date === todayStr));
  };

  const handleBiometricLogin = async () => {
    const cleanRoll = rollNo.toUpperCase().trim();
    if (!cleanRoll) return alert('Enter your registered Roll Number!');
    setStatus('Finding your profile...');

    const { data: student, error } = await supabase
      .from('students')
      .select('*')
      .eq('roll_no', cleanRoll)
      .single();

    if (error || !student) {
      return setStatus('❌ Roll Number not found! Please complete Student Registration first.');
    }

    try {
      setStatus('👆 Scan your Fingerprint or Face ID to open your dashboard...');
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

      const todayStr = new Date().toISOString().slice(0, 10);
      await supabase
        .from('daily_attendance')
        .upsert([{ roll_no: cleanRoll, attendance_date: todayStr, status: 'Present' }], {
          onConflict: 'roll_no,attendance_date',
        });

      await loadAttendance(cleanRoll);
      setStudentProfile(student);
      setStatus('');
    } catch (err: any) {
      setStatus(`❌ Verification failed: ${err?.message || 'Try again'}`);
    }
  };

  return (
    <main className="min-h-screen bg-slate-950 text-white p-6 flex flex-col items-center">
      <h1 className="text-2xl font-bold mb-6">Student Attendance Portal</h1>

      {!studentProfile ? (
        <div className="w-full max-w-md bg-slate-900 p-6 rounded-2xl border border-slate-800 space-y-4">
          <p className="text-sm text-slate-400">
            Verify with your registered Fingerprint or Face ID to mark attendance and view your dashboard.
          </p>
          <input
            type="text"
            placeholder="Enter Registered Roll Number"
            value={rollNo}
            onChange={(e) => setRollNo(e.target.value)}
            className="w-full p-3 rounded-lg bg-slate-800 border border-slate-700 uppercase"
          />
          <button
            onClick={handleBiometricLogin}
            className="w-full bg-emerald-600 hover:bg-emerald-500 py-3 rounded-lg font-semibold"
          >
            👆 Verify Fingerprint / Face ID
          </button>
          {status && <p className="text-center font-medium pt-2">{status}</p>}
        </div>
      ) : (
        <div className="w-full max-w-lg space-y-6">
          <div className="bg-slate-900 p-6 rounded-2xl border border-slate-800 flex items-center gap-4">
            {studentProfile.photo_url && (
              <img
                src={studentProfile.photo_url}
                alt={studentProfile.student_name}
                className="w-20 h-20 rounded-full object-cover border-2 border-emerald-400"
              />
            )}
            <div className="space-y-1">
              <h2 className="text-xl font-bold">{studentProfile.student_name}</h2>
              <p className="text-sm text-emerald-400 font-mono font-semibold">
                Roll No: {studentProfile.roll_no}
              </p>
              <div className="flex flex-wrap gap-2 pt-1 text-xs">
                <span className="bg-slate-800 px-2.5 py-1 rounded-md">
                  Class: <strong>{studentProfile.student_class}</strong>
                </span>
                <span className="bg-slate-800 px-2.5 py-1 rounded-md">
                  Section: <strong>{studentProfile.section}</strong>
                </span>
                <span className="bg-slate-800 px-2.5 py-1 rounded-md">
                  Year: <strong>{studentProfile.year_of_study}</strong>
                </span>
              </div>
            </div>
          </div>

          <div className="bg-slate-900 p-6 rounded-2xl border border-slate-800">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-bold text-lg">Attendance Record</h3>
              <span className="bg-emerald-500/20 text-emerald-400 text-xs font-semibold px-3 py-1 rounded-full">
                {markedToday ? '✅ Present Today' : 'Pending'} • Total Days: {records.length}
              </span>
            </div>

            <div className="space-y-2 max-h-64 overflow-y-auto">
              {records.map((rec) => (
                <div key={rec.id} className="bg-slate-800 p-3 rounded-lg flex justify-between items-center text-sm">
                  <span>{rec.attendance_date}</span>
                  <span className="text-emerald-400 font-semibold">{rec.status}</span>
                </div>
              ))}
            </div>

            <button
              onClick={() => setStudentProfile(null)}
              className="mt-6 w-full bg-slate-800 hover:bg-slate-700 py-2.5 rounded-lg text-sm font-medium"
            >
              Logout
            </button>
          </div>
        </div>
      )}
    </main>
  );
}
