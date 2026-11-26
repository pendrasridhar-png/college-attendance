import Link from 'next/link';

export default function Home() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-950 via-indigo-950 to-slate-900 text-white flex flex-col justify-between p-6">
      <header className="max-w-5xl w-full mx-auto flex items-center justify-between py-2">
        <div className="flex items-center gap-2.5">
          <span className="w-3 h-3 rounded-full bg-emerald-400 animate-pulse" />
          <span className="font-bold tracking-wide text-lg">SmartCampus ID</span>
        </div>
        <span className="text-xs bg-white/10 border border-white/15 px-3 py-1 rounded-full text-slate-300">
          Biometric & Hour-Wise Attendance
        </span>
      </header>

      <section className="max-w-5xl w-full mx-auto my-auto py-10">
        <div className="text-center max-w-2xl mx-auto mb-12 space-y-3">
          <span className="inline-block text-xs font-semibold uppercase tracking-widest text-indigo-300 bg-indigo-500/20 border border-indigo-400/30 px-3.5 py-1 rounded-full">
            Zero-Proxy Biometric Verification
          </span>
          <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight bg-gradient-to-r from-white via-indigo-100 to-emerald-200 bg-clip-text text-transparent">
            College Smart Attendance Portal
          </h1>
          <p className="text-slate-300 text-sm sm:text-base">
            Select your portal below. Students verify via Fingerprint & Face Scan; Faculty manage live hourly classes and timetables.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          <div className="group bg-slate-900/80 backdrop-blur-md border border-emerald-500/30 hover:border-emerald-400 rounded-3xl p-7 flex flex-col justify-between shadow-2xl transition">
            <div>
              <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 border border-emerald-400/30 flex items-center justify-center text-2xl mb-5">
                🎓
              </div>
              <h2 className="text-2xl font-bold mb-2">Student Portal</h2>
              <p className="text-sm text-slate-400 mb-6">
                Register once with your Roll Number, Course, Class, Section, Year & Face/Fingerprint, or log in to view your attendance dashboard.
              </p>
            </div>

            <div className="space-y-3">
              <Link
                href="/student"
                className="block w-full bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-center py-3.5 rounded-xl transition shadow-lg shadow-emerald-500/20"
              >
                👆 Student Biometric Login
              </Link>
              <Link
                href="/register"
                className="block w-full bg-slate-800 hover:bg-slate-700 text-emerald-300 border border-emerald-500/30 font-semibold text-center py-3 rounded-xl text-sm transition"
              >
                + New Student Registration (Face & Fingerprint)
              </Link>
            </div>
          </div>

          <div className="group bg-slate-900/80 backdrop-blur-md border border-indigo-500/30 hover:border-indigo-400 rounded-3xl p-7 flex flex-col justify-between shadow-2xl transition">
            <div>
              <div className="w-12 h-12 rounded-2xl bg-indigo-500/20 border border-indigo-400/30 flex items-center justify-center text-2xl mb-5">
                👨‍🏫
              </div>
              <h2 className="text-2xl font-bold mb-2">Staff & Admin Portal</h2>
              <p className="text-sm text-slate-400 mb-6">
                Authorized faculty log in with their Name, Subject & Class Hour (1–7), update timetable subjects anytime, and track student attendance.
              </p>
            </div>

            <div className="space-y-3">
              <Link
                href="/teacher"
                className="block w-full bg-indigo-500 hover:bg-indigo-400 text-white font-bold text-center py-3.5 rounded-xl transition shadow-lg shadow-indigo-500/20"
              >
                🔐 Staff Class Login
              </Link>
              <Link
                href="/teacher"
                className="block w-full bg-slate-800 hover:bg-slate-700 text-indigo-300 border border-indigo-500/30 font-semibold text-center py-3 rounded-xl text-sm transition"
              >
                🛡️ Admin Control & Permissions
              </Link>
            </div>
          </div>
        </div>
      </section>

      <footer className="text-center text-xs text-slate-500 py-2">
        Hardware WebAuthn Biometrics • 7-Hour Timetable Support • Real-Time Cloud Sync
      </footer>
    </main>
  );
}
