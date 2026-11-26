'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';

function base64ToBuffer(base64: string) {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes.buffer;
}

const HOURS = [
  'Hour 1 (9:15 - 10:10)',
  'Hour 2 (10:10 - 11:05)',
  'Hour 3 (11:20 - 12:15)',
  'Hour 4 (12:15 - 1:10)',
  'Hour 5 (2:00 - 2:45)',
  'Hour 6 (2:45 - 3:30)',
  'Hour 7 (3:30 - 4:15)',
];


export default function StudentDashboardPage() {
  const [rollNo, setRollNo] = useState('');
  const [studentProfile, setStudentProfile] = useState<any>(null);
  const [records, setRecords] = useState<any[]>([]);
  const [selectedHour, setSelectedHour] = useState(HOURS);
  const [subjectName, setSubjectName] = useState('');
  const [status, setStatus] = useState('');
  const [markMsg, setMarkMsg] = useState('');
  const [liveTime, setLiveTime] = useState('');
  const [blurred, setBlurred] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem('registered_roll');
    if (saved) setRollNo(saved);

    const clock = setInterval(() => {
      setLiveTime(new Date().toLocaleTimeString());
    }, 1000);

    const handleVisibility = () => setBlurred(document.hidden);
    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      clearInterval(clock);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, []);

  const loadAttendance = async (cleanRoll: string) => {
    const { data } = await supabase
      .from('daily_attendance')
      .select('*')
      .eq('roll_no', cleanRoll)
      .order('attendance_date', { ascending: false })
      .order('period_no', { ascending: true });

    setRecords(data || []);
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
      return setStatus('❌ Roll Number not found! Please register first.');
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

      await loadAttendance(cleanRoll);
      setStudentProfile(student);
      setStatus('');
    } catch (err: any) {
      setStatus(`❌ Verification failed: ${err?.message || 'Try again'}`);
    }
  };

  const handleMarkHour = async () => {
    if (!subjectName.trim()) return alert('Enter the Subject Name for this hour!');
    const todayStr = new Date().toISOString().slice(0, 10);

    const { error } = await supabase.from('daily_attendance').upsert(
      [
        {
          roll_no: studentProfile.roll_no,
          attendance_date: todayStr,
          period_no: selectedHour,
          subject_name: subjectName.trim(),
          status: 'Present',
        },
      ],
      { onConflict: 'roll_no,attendance_date,period_no' }
    );

    if (error) return setMarkMsg(`❌ Error: ${error.message}`);

    await loadAttendance(studentProfile.roll_no);
    setMarkMsg(`✅ Marked Present for ${selectedHour} (${subjectName.trim()})`);
    setSubjectName('');
  };

  const handleLogout = () => {
    setStudentProfile(null);
    setRecords([]);
    setMarkMsg('');
  };

  const todayStr = new Date().toISOString().slice(0, 10);
  const todayCount = records.filter((r) => r.attendance_date === todayStr).length;

  return (
    <main className={`min-h-screen bg-gradient-to-br from-slate-950 via-indigo-950 to-slate-900 text-white p-6 flex flex-col items-center select-none ${blurred ? 'blur-md' : ''}`}>
      <div className="w-full max-w-lg flex items-center justify-between mb-6">
        <Link href="/" className="text-xs text-slate-400 hover:text-white">← Home</Link>
        {studentProfile && (
          <button
            onClick={handleLogout}
            className="bg-red-500/20 hover:bg-red-500/30 text-red-300 border border-red-500/30 px-3.5 py-1.5 rounded-xl text-xs font-semibold"
          >
            Logout
          </button>
        )}
      </div>

      <h1 className="text-2xl font-bold mb-6">Student Biometric Portal</h1>

      {!studentProfile ? (
        <div className="w-full max-w-md bg-slate-900/90 backdrop-blur p-7 rounded-3xl border border-slate-800 space-y-4 shadow-2xl">
          <p className="text-sm text-slate-400">
            Enter your Roll Number and verify via Fingerprint / Face ID to access your personal attendance dashboard.
          </p>
          <input
            type="text"
            placeholder="Enter Registered Roll Number"
            value={rollNo}
            onChange={(e) => setRollNo(e.target.value)}
            className="w-full p-3.5 rounded-xl bg-slate-800 border border-slate-700 uppercase text-sm"
          />
          <button
            onClick={handleBiometricLogin}
            className="w-full bg-emerald-500 hover:bg-emerald-400 text-slate-950 py-3.5 rounded-xl font-bold shadow-lg shadow-emerald-500/20"
          >
            👆 Verify Fingerprint / Face ID & Login
          </button>
          {status && <p className="text-center font-medium text-sm pt-2">{status}</p>}
        </div>
      ) : (
        <div className="w-full max-w-lg space-y-6">
          {/* Live Anti-Screenshot Security Banner */}
          <div className="bg-emerald-500/15 border border-emerald-400/30 rounded-2xl px-4 py-2.5 flex items-center justify-between text-xs">
            <span className="text-emerald-300 font-semibold flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
              Live Biometric Session
            </span>
            <span className="font-mono text-white font-bold">{liveTime || 'Active'}</span>
          </div>

          {/* Student Profile Card */}
          <div className="bg-slate-900/90 p-6 rounded-3xl border border-slate-800 flex items-center gap-4 shadow-xl">
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
              <div className="flex flex-wrap gap-1.5 pt-1 text-xs">
                <span className="bg-indigo-500/20 text-indigo-300 px-2.5 py-1 rounded-lg">
                  Course: <strong>{studentProfile.course || 'B.Tech'}</strong>
                </span>
                <span className="bg-slate-800 px-2.5 py-1 rounded-lg">
                  Class: <strong>{studentProfile.student_class}</strong>
                </span>
                <span className="bg-slate-800 px-2.5 py-1 rounded-lg">
                  Sec: <strong>{studentProfile.section}</strong>
                </span>
                <span className="bg-slate-800 px-2.5 py-1 rounded-lg">
                  Year: <strong>{studentProfile.year_of_study}</strong>
                </span>
              </div>
            </div>
          </div>

          {/* Mark Hour Attendance */}
          <div className="bg-slate-900/90 p-6 rounded-3xl border border-slate-800 space-y-3 shadow-xl">
            <h3 className="font-bold text-lg">Mark Class Hour Attendance</h3>
            <select
              value={selectedHour}
              onChange={(e) => setSelectedHour(e.target.value)}
              className="w-full p-3 rounded-xl bg-slate-800 border border-slate-700 text-sm"
            >
              {HOURS.map((h) => (
                <option key={h} value={h}>{h}</option>
              ))}
            </select>
            <input
              type="text"
              placeholder="Enter Subject Name (e.g., Data Structures)"
              value={subjectName}
              onChange={(e) => setSubjectName(e.target.value)}
              className="w-full p-3 rounded-xl bg-slate-800 border border-slate-700 text-sm"
            />
            <button
              onClick={handleMarkHour}
              className="w-full bg-emerald-500 hover:bg-emerald-400 text-slate-950 py-3 rounded-xl font-bold text-sm"
            >
              ✅ Submit Hour Attendance
            </button>
            {markMsg && <p className="text-center text-sm font-medium text-emerald-400">{markMsg}</p>}
          </div>

          {/* Attendance History */}
          <div className="bg-slate-900/90 p-6 rounded-3xl border border-slate-800 shadow-xl">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-bold text-lg">Attendance History</h3>
              <span className="bg-emerald-500/20 text-emerald-400 text-xs font-semibold px-3 py-1 rounded-full">
                Today: {todayCount} / 7 Hours • Total: {records.length}
              </span>
            </div>

            <div className="space-y-2 max-h-64 overflow-y-auto">
              {records.length === 0 && (
