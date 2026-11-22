'use client';
import { useState, useRef } from 'react';
import { supabase } from '@/lib/supabase';

function bufferToBase64(buffer: ArrayBuffer) {
  return btoa(String.fromCharCode(...new Uint8Array(buffer)));
}

export default function RegisterPage() {
  const [name, setName] = useState('');
  const [rollNo, setRollNo] = useState('');
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
      alert('Camera access denied! Please allow camera permission.');
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
    if (!name.trim() || !rollNo.trim()) return alert('Enter Name and Roll Number!');
    if (!photoData) return alert('Please capture your Face Scan photo first!');

    try {
      setStatus('Scanning Fingerprint / Face ID on your device...');
      const challenge = crypto.getRandomValues(new Uint8Array(32));
      const userId = new TextEncoder().encode(rollNo.toUpperCase());

      const credential = (await navigator.credentials.create({
        publicKey: {
          challenge,
          rp: { name: 'College Attendance System' },
          user: {
            id: userId,
            name: rollNo.toUpperCase(),
            displayName: name,
          },
          pubKeyCredParams: [
            { type: 'public-key', alg: -7 },
            { type: 'public-key', alg: -257 },
          ],
          authenticatorSelection: {
            authenticatorAttachment: 'platform',
            userVerification: 'required',
          },
          timeout: 60000,
        },
      })) as PublicKeyCredential | null;

      if (!credential) return setStatus('❌ Biometric enrollment cancelled.');

      const credentialId = bufferToBase64(credential.rawId);

      const { error } = await supabase.from('students').insert([
        {
          student_name: name.trim(),
          roll_no: rollNo.toUpperCase().trim(),
          credential_id: credentialId,
          photo_url: photoData,
        },
      ]);

      if (error) {
        if (error.code === '23505') return setStatus('⚠️ This Roll Number is already registered!');
        return setStatus(`❌ Database Error: ${error.message}`);
      }

      localStorage.setItem('registered_roll', rollNo.toUpperCase().trim());
      setStatus('✅ Registration Complete! Face & Fingerprint saved.');
    } catch (err: any) {
      setStatus(`❌ Biometric Error: ${err?.message || 'Device biometric not supported'}`);
    }
  };

  return (
    <main className="min-h-screen bg-slate-950 text-white p-6 flex flex-col items-center">
      <h1 className="text-2xl font-bold mb-2">Student Enrollment</h1>
      <p className="text-slate-400 text-sm mb-6 text-center">One-time Face Scan & Fingerprint Registration</p>

      <div className="w-full max-w-md bg-slate-900 p-6 rounded-2xl border border-slate-800 space-y-4">
        <input
          type="text"
          placeholder="Full Name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full p-3 rounded-lg bg-slate-800 border border-slate-700"
        />
        <input
          type="text"
          placeholder="Roll Number (e.g., 22A91A0501)"
          value={rollNo}
          onChange={(e) => setRollNo(e.target.value)}
          className="w-full p-3 rounded-lg bg-slate-800 border border-slate-700 uppercase"
        />

        {/* Step A: Face Capture */}
        <div className="bg-slate-800 p-4 rounded-xl text-center">
          {photoData ? (
            <div className="flex flex-col items-center gap-2">
              <img src={photoData} alt="Student Face" className="w-28 h-28 rounded-full object-cover border-2 border-emerald-400" />
              <button onClick={openCamera} className="text-xs text-slate-400 underline">Retake Face Scan</button>
            </div>
          ) : cameraOpen ? (
            <div className="flex flex-col items-center gap-3">
              <video ref={videoRef} autoPlay playsInline className="w-48 h-48 rounded-xl object-cover bg-black" />
              <button onClick={captureFace} className="bg-purple-600 px-4 py-2 rounded-lg text-sm font-semibold">
                Capture Face Photo
              </button>
            </div>
          ) : (
            <button onClick={openCamera} className="w-full bg-slate-700 hover:bg-slate-600 py-3 rounded-lg font-medium">
              📸 Step 1: Start Face Scan
            </button>
          )}
        </div>

        {/* Step B: Fingerprint / Face ID */}
        <button
          onClick={handleRegisterBiometrics}
          className="w-full bg-purple-600 hover:bg-purple-500 py-3 rounded-lg font-semibold"
        >
          👆 Step 2: Register Fingerprint / Face ID
        </button>

        {status && <p className="text-center font-medium pt-2">{status}</p>}
      </div>
    </main>
  );
}
