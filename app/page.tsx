import Link from 'next/link';

export default function Home() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center bg-slate-950 text-white p-6">
      <h1 className="text-3xl font-bold mb-2 text-center">College Attendance System</h1>
      <p className="text-slate-400 mb-8 text-center">Biometric Student Registration & Attendance Portal</p>

      <div className="flex flex-col gap-4 w-full max-w-md">
        <Link href="/register" className="bg-purple-600 hover:bg-purple-500 text-center py-4 rounded-xl font-semibold text-lg transition">
          1. Student Registration (Face + Fingerprint)
        </Link>
        <Link href="/student" className="bg-emerald-600 hover:bg-emerald-500 text-center py-4 rounded-xl font-semibold text-lg transition">
          2. Student Biometric Login & Dashboard
        </Link>
        <Link href="/teacher" className="bg-blue-600 hover:bg-blue-500 text-center py-4 rounded-xl font-semibold text-lg transition">
          3. Faculty Attendance Dashboard
        </Link>
      </div>
    </main>
  );
}
