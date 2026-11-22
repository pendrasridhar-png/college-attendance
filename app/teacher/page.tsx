'use client';
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

// Change this to your own secret Admin PIN
const MASTER_ADMIN_PIN = 'ADMIN123';

export default function FacultyDashboardPage() {
  const [pinInput, setPinInput] = useState('');
  const [role, setRole] = useState<'admin' | 'faculty' | null>(null);
  const [currentUserLabel, setCurrentUserLabel] = useState('');
  const [loginError, setLoginError] = useState('');

  // Attendance & Roster State
  const [students, setStudents] = useState<any[]>([]);
  const [todayPresent, setTodayPresent] = useState<Set<string>>(new Set());
  const [filterClass, setFilterClass] = useState('ALL');
  const [filterSection, setFilterSection] = useState('ALL');
  const [filterYear, setFilterYear] = useState('ALL');

  // Admin: Pre-authorized Faculty Management State
  const [facultyList, setFacultyList] = useState<any[]>([]);
  const [newFacultyName, setNewFacultyName] = useState('');
  const [newSubjectClass, setNewSubjectClass] = useState('');
  const [newAccessCode, setNewAccessCode] = useState('');
  const [showManager, setShowManager] = useState(false);

  const handleLogin = async () => {
    const entered = pinInput.trim();
    if (!entered) return setLoginError('Enter your Admin PIN or Faculty Access Code.');

    // 1. Check Master Admin PIN (You)
    if (entered === MASTER_ADMIN_PIN) {
      setRole('admin');
      setCurrentUserLabel('Master Admin (You)');
      setLoginError('');
      return;
    }

    // 2. Check Pre-Authorized Faculty Access Code
    const { data: fac } = await supabase
      .from('faculty_access')
      .select('*')
      .eq('access_code', entered.toUpperCase())
      .eq('is_active', true)
      .single();

    if (fac) {
      setRole('faculty');
      setCurrentUserLabel(`${fac.faculty_name} (${fac.subject_class})`);
      setLoginError('');
    } else {
      setLoginError('❌ Invalid or inactive PIN / Faculty Access Code.');
    }
  };

  const fetchData = async () => {
    const today = new Date().toISOString().split('T')[0];

    const { data: studentList } = await supabase
      .from('students')
      .select('*')
      .order('roll_no', { ascending: true });

    const { data: attList } = await supabase
      .from('daily_attendance')
      .select('roll_no')
      .eq('attendance_date', today);

    setStudents(studentList || []);
    setTodayPresent(new Set((attList || []).map((a) => a.roll_no)));

    if (role === 'admin') {
      const { data: facs } = await supabase
        .from('faculty_access')
        .select('*')
        .order('created_at', { ascending: false });
      setFacultyList(facs || []);
    }
  };

  useEffect(() => {
    if (role) fetchData();
  }, [role]);

  const addFacultyPermission = async () => {
    if (!newFacultyName.trim() || !newAccessCode.trim()) {
      return alert('Enter Faculty Name and an Access Code!');
    }
    const { error } = await supabase.from('faculty_access').insert([
      {
        faculty_name: newFacultyName.trim(),
        subject_class: newSubjectClass.trim() || 'General Class',
        access_code: newAccessCode.toUpperCase().trim(),
        is_active: true,
      },
    ]);
    if (error) return alert(`Error: ${error.message}`);
    setNewFacultyName('');
    setNewSubjectClass('');
    setNewAccessCode('');
    fetchData();
  };

  const toggleFacultyStatus = async (id: number, currentStatus: boolean) => {
    await supabase.from('faculty_access').update({ is_active: !currentStatus }).eq('id', id);
    fetchData();
  };

  // Locked Login Gate
  if (!role) {
    return (
      <main className="min-h-screen bg-slate-950 text-white p-6 flex flex-col items-center justify-center">
        <div className="w-full max-w-md bg-slate-900 p-6 rounded-2xl border border-slate-800 space-y-4">
          <h1 className="text-2xl font-bold text-center">Restricted Faculty Portal</h1>
          <p className="text-sm text-slate-400 text-center">
            Only authorized faculty taking class and Admin can access attendance records.
          </p>
          <input
            type="password"
            placeholder="Enter Admin PIN or Pre-Assigned Faculty Code"
            value={pinInput}
            onChange={(e) => setPinInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
            className="w-full p-3 rounded-lg bg-slate-800 border border-slate-700 text-center tracking-widest"
          />
          <button
            onClick={handleLogin}
            className="w-full bg-blue-600 hover:bg-blue-500 py-3 rounded-lg font-semibold"
          >
            Unlock Dashboard
          </button>
          {loginError && <p className="text-center text-red-400 text-sm font-medium">{loginError}</p>}
        </div>
      </main>
    );
  }

  const filtered = students.filter((s) => {
    if (filterClass !== 'ALL' && s.student_class !== filterClass) return false;
    if (filterSection !== 'ALL' && s.section !== filterSection) return false;
    if (filterYear !== 'ALL' && s.year_of_study !== filterYear) return false;
    return true;
  });

  return (
    <main className="min-h-screen bg-slate-950 text-white p-6 flex flex-col items-center">
      <div className="w-full max-w-4xl">
        {/* Top Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold">Faculty Attendance Dashboard</h1>
            <p className="text-xs text-blue-400 font-medium">Logged in as: {currentUserLabel}</p>
            <p className="text-sm text-slate-400 mt-1">
              Present Today: <strong className="text-emerald-400">{todayPresent.size}</strong> / {students.length} Registered
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {role === 'admin' && (
              <button
                onClick={() => setShowManager(!showManager)}
                className="bg-purple-600 hover:bg-purple-500 px-4 py-2 rounded-lg text-sm font-semibold"
              >
                {showManager ? 'Hide Faculty Permissions' : '🔑 Manage Faculty Access'}
              </button>
            )}
            <button onClick={fetchData} className="bg-blue-600 hover:bg-blue-500 px-4 py-2 rounded-lg text-sm font-semibold">
              Refresh
            </button>
            <button
              onClick={() => {
                setRole(null);
                setPinInput('');
              }}
              className="bg-slate-800 hover:bg-slate-700 px-4 py-2 rounded-lg text-sm"
            >
              Lock
            </button>
          </div>
        </div>

        {/* Admin-Only Faculty Access Manager */}
        {role === 'admin' && showManager && (
          <div className="bg-slate-900 p-5 rounded-2xl border border-purple-500/40 mb-6 space-y-4">
            <h2 className="font-bold text-lg text-purple-300">Pre-Authorize Faculty Before Class (Optional)</h2>
            <p className="text-xs text-slate-400">
              Create or toggle access codes for faculty taking class. Deactivate anytime when their class ends.
            </p>
            <div className="grid sm:grid-cols-4 gap-2">
              <input
                type="text"
                placeholder="Faculty Name (e.g., Prof. Rao)"
                value={newFacultyName}
                onChange={(e) => setNewFacultyName(e.target.value)}
                className="p-2.5 rounded-lg bg-slate-800 border border-slate-700 text-sm"
              />
              <input
                type="text"
                placeholder="Subject / Class (e.g., CSE-A)"
                value={newSubjectClass}
                onChange={(e) => setNewSubjectClass(e.target.value)}
                className="p-2.5 rounded-lg bg-slate-800 border border-slate-700 text-sm"
              />
              <input
                type="text"
                placeholder="Access Code (e.g., RAO101)"
                value={newAccessCode}
                onChange={(e) => setNewAccessCode(e.target.value)}
                className="p-2.5 rounded-lg bg-slate-800 border border-slate-700 text-sm uppercase"
              />
              <button
                onClick={addFacultyPermission}
                className="bg-purple-600 hover:bg-purple-500 rounded-lg font-semibold text-sm py-2.5"
              >
                + Grant Access
              </button>
            </div>

            {facultyList.length > 0 && (
              <div className="space-y-2 pt-2">
                {facultyList.map((f) => (
                  <div key={f.id} className="bg-slate-800 p-3 rounded-lg flex items-center justify-between text-sm">
                    <div>
                      <span className="font-bold">{f.faculty_name}</span>{' '}
                      <span className="text-slate-400">({f.subject_class})</span> • Code:{' '}
                      <span className="font-mono text-purple-300 font-bold">{f.access_code}</span>
                    </div>
                    <button
                      onClick={() => toggleFacultyStatus(f.id, f.is_active)}
                      className={`px-3 py-1 rounded-md text-xs font-semibold ${
                        f.is_active ? 'bg-emerald-600 text-white' : 'bg-slate-700 text-slate-300'
                      }`}
                    >
                      {f.is_active ? 'Active (Click to Revoke)' : 'Inactive (Click to Enable)'}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Filters */}
        <div className="grid grid-cols-3 gap-3 mb-6 bg-slate-900 p-4 rounded-xl border border-slate-800">
          <select value={filterClass} onChange={(e) => setFilterClass(e.target.value)} className="p-2.5 rounded-lg bg-slate-800 border border-slate-700 text-sm">
            <option value="ALL">All Classes</option>
