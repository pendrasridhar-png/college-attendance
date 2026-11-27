'use client';
import { useState, useRef } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';

function bufferToBase64(buffer: ArrayBuffer) {
  return btoa(String.fromCharCode(...new Uint8Array(buffer)));
}

export default function RegisterPage() {
  const [name, setName] = useState('');
  const [rollNo, setRollNo] = useState('');
  const [course, setCourse] = useState('B.Tech');
  const [studentClass, setStudentClass] = useState('CSE');
  const [section, setSection] = useState('A');
  const [yearOfStudy, setYearOfStudy] = useState('1st Year');
  const [photoData, setPhotoData] = useState<string | null>(null);
  const [cameraOpen, setCameraOpen] = useState(false);
  const [status, setStatus] = useState('');
  const videoRef = useRef<HTMLVideoElement | null>(null);

  const openCamera = async () => {
    setCameraOpen(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' } });
      if (videoRef.current) videoRef.current.srcObject = stream;
    } catch {
      alert('Camera access denied! Please allow camera permission in Chrome/Safari.');
      setCameraOpen(false);
    }
  };

  const captureFace = () => {
    if (!videoRef.current) return;
    const canvas = document.createElement('canvas');
    canvas.width = 240;
    canvas.height = 240;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.drawImage(videoRef.current, 0, 0, 240, 240);
      setPhotoData(canvas.toDataURL('image/jpeg', 0.7));
    }
    const stream = videoRef.current.srcObject as MediaStream;
    stream?.getTracks().forEach((t) => t.stop());
    setCameraOpen(false);
  };

  const handleRegisterBiometrics = async () => {
    if (!name.trim() || !rollNo.trim()) return alert('Enter Full Name and Roll Number!');
    if (!photoData) return alert('Please capture your Face Scan photo first!');

    try {
      setStatus('Scanning Fingerprint / Face ID on your device...');
      const challenge = crypto.getRandomValues(new Uint8Array(32));
      const userId = new TextEncoder().encode(rollNo.toUpperCase());

      const credential = (await navigator.credentials.create({
        publicKey: {
          challenge,
          rp: { name: 'SmartCampus ID' },
          user: { id: userId, name: rollNo.toUpperCase(), displayName: name },
          pubKeyCredParams: [
            { type: 'public-key', alg: -7 },
            { type: 'public-key', alg: -257 },
          ],
          authenticatorSelection: { authenticatorAttachment: 'platform', userVerification: 'required' },
          timeout: 60000,
        },
      })) as PublicKeyCredential | null;

      if (!credential) return setStatus('❌ Biometric enrollment cancelled.');

      const credentialId = bufferToBase64(credential.rawId);

      const { error } = await supabase.from('students').insert([
        {
          student_name: name.trim(),
          roll_no: rollNo.toUpperCase().trim(),
          course,
          student_class: studentClass,
          section,
          year_of_study: yearOfStudy,
          credential_id: credentialId,
          photo_url: photoData,
        },
      ]);

      if (error) {
        if (error.code === '23505') return setStatus('⚠️ This Roll Number is already registered!');
        return setStatus(`❌ Database Error: ${error.message}`);
      }

      localStorage.setItem('registered_roll', rollNo.toUpperCase().trim());
      setStatus('✅ Registration Complete! You can now log in to your dashboard.');
    } catch (err: any) {
      setStatus(`❌ Biometric Error: ${err?.message || 'Device biometric not supported'}`);
    }
  };

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-950 via-indigo-950 to-slate-900 text-white p-6 flex flex-col items-center">
      <div className="w-full max-w-md flex items-center justify-between mb-6">
        <Link href="/" className="text-xs text-slate-400 hover:text-white">← Back to Home</Link>
        <span className="text-xs text-emerald-400 font-semibold">Student Enrollment</span>
      </div>

      <h1 className="text-2xl font-bold mb-1">Student Registration</h1>
      <p className="text-slate-400 text-sm mb-6 text-center">Enter academic profile, Face Scan & Fingerprint</p>

      <div className="w-full max-w-md bg-slate-900/90 backdrop-blur p-6 rounded-3xl border border-slate-800 space-y-4 shadow-2xl">
        <input
          type="text"
          placeholder="Full Name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full p-3 rounded-xl bg-slate-800 border border-slate-700 text-sm"
        />
        <input
          type="text"
          placeholder="Roll Number (e.g., 25NQ1A0590)"
          value={rollNo}
          onChange={(e) => setRollNo(e.target.value)}
          className="w-full p-3 rounded-xl bg-slate-800 border border-slate-700 uppercase text-sm"
        />

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs text-slate-400 block mb-1">Course</label>
            <select value={course} onChange={(e) => setCourse(e.target.value)} className="w-full p-2.5 rounded-xl bg-slate-800 border border-slate-700 text-sm">
              <option value="B.Tech">B.Tech</option>
              <option value="M.Tech">M.Tech</option>
              <option value="B.Sc">B.Sc</option>
              <option value="BBA">BBA</option>
              <option value="MBA">MBA</option>
              <option value="MCA">MCA</option>
            </select>
          </div>
          <div>
            <label className="text-xs text-slate-400 block mb-1">Class / Branch</label>
            <select value={studentClass} onChange={(e) => setStudentClass(e.target.value)} className="w-full p-2.5 rounded-xl bg-slate-800 border border-slate-700 text-sm">
              <option value="CSE">CSE</option>
              <option value="ECE">ECE</option>
              <option value="EEE">EEE</option>
              <option value="MECH">MECH</option>
              <option value="CIVIL">CIVIL</option>
              <option value="IT">IT</option>
              <option value="AIML">AIML</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs text-slate-400 block mb-1">Section</label>
            <select value={section} onChange={(e) => setSection(e.target.value)} className="w-full p-2.5 rounded-xl bg-slate-800 border border-slate-700 text-sm">
              <option value="A">Section A</option>
              <option value="B">Section B</option>
              <option value="C">Section C</option>
              <option value="D">Section D</option>
            </select>
          </div>
          <div>
            <label className="text-xs text-slate-400 block mb-1">Year of Study</label>
            <select value={yearOfStudy} onChange={(e) => setYearOfStudy(e.target.value)} className="w-full p-2.5 rounded-xl bg-slate-800 border border-slate-700 text-sm">
              <option value="1st Year">1st Year</option>
              <option value="2nd Year">2nd Year</option>
              <option value="3rd Year">3rd Year</option>
              <option value="4th Year">4th Year</option>
            </select>
          </div>
        </div>

        <div className="bg-slate-800/80 p-4 rounded-2xl text-center border border-slate-700">
          {photoData ? (
            <div className="flex flex-col items-center gap-2">
              <img src={photoData} alt="Student Face" className="w-28 h-28 rounded-full object-cover border-2 border-emerald-400" />
              <button onClick={openCamera} className="text-xs text-slate-400 underline">Retake Face Scan</button>
            </div>
          ) : cameraOpen ? (
            <div className="flex flex-col items-center gap-3">
              <video ref={videoRef} autoPlay playsInline className="w-48 h-48 rounded-xl object-cover bg-black" />
              <button onClick={captureFace} className="bg-emerald-500 text-slate-950 px-4 py-2 rounded-lg text-sm font-bold">
                Capture Face Photo
              </button>
            </div>
          ) : (
            <button onClick={openCamera} className="w-full bg-slate-700 hover:bg-slate-600 py-3 rounded-xl font-medium text-sm">
              📸 Step 1: Capture Face Scan
            </button>
          )}
        </div>

        <button
          onClick={handleRegisterBiometrics}
          className="w-full bg-emerald-500 hover:bg-emerald-400 text-slate-950 py-3.5 rounded-xl font-bold shadow-lg shadow-emerald-500/20"
        >
          👆 Step 2: Register Fingerprint / Face ID
        </button>

        {status && (
          <div className="text-center space-y-2 pt-2">
            <p className="font-medium text-sm">{status}</p>
            {status.startsWith('✅') && (
              <Link href="/student" className="inline-block bg-indigo-500 px-5 py-2 rounded-xl text-sm font-semibold">
                Go to Student Login →
              </Link>
            )}
          </div>
        )}
      </div>
    </main>
  );
}
