import Link from 'next/link';

export default function Home() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center bg-slate-950 text-white p-6">
      <h1 className="text-3xl font-bold mb-2 text-center">College Attendance System</h1>
      <p className="text-slate-400 mb-8 text-center">Select your portal to continue</p>
      
      <div className="flex flex-col sm:flex-row gap-4 w-full max-w-md">
        <Link href="/teacher" className="flex-1 bg-blue-600 hover:bg-blue-500 text-center py-4 rounded-xl font-semibold text-lg transition">
          Professor Portal
        </Link>
        <Link href="/student" className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-center py-4 rounded-xl font-semibold text-lg transition">
          Student Scanner
        </Link>
      </div>
    </main>
  );
}
