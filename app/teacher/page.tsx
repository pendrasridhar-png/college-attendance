'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';

const MASTER_ADMIN_PIN = 'ADMIN123';

const HOURS = [
  'Hour 1 (9:15 - 10:10)',
  'Hour 2 (10:10 - 11:05)',
  'Hour 3 (11:20 - 12:15)',
  'Hour 4 (12:15 - 1:10)',
  'Hour 5 (2:00 - 2:45)',
  'Hour 6 (2:45 - 3:30)',
  'Hour 7 (3:30 - 4:15)',
];

export default function StaffAdminDashboardPage() {
  const [loginTab, setLoginTab] = useState<'staff' | 'admin'>('staff');
  const [role, setRole] = useState<'staff' | 'admin' | null>(null);
  const [loginError, setLoginError] = useState('');

  const [staffCode, setStaffCode] = useState('');
  const [staffName, setStaffName] = useState('');
  const [staffSubject, setStaffSubject] = useState('');
  const [staffHour, setStaffHour] = useState<string>(HOURS[0]);
  const [editingSubject, setEditingSubject] = useState(false);
  const [newSubjectInput, setNewSubjectInput] = useState('');

  const [adminPin, setAdminPin] = useState('');

  const [filterCourse, setFilterCourse] = useState('ALL');
  const [filterClass, setFilterClass] = useState('ALL');
  const [filterSection, setFilterSection] = useState('ALL');
  const [filterYear, setFilterYear] = useState('ALL');
  const [selectedHour, setSelectedHour] = useState<string>(HOURS[0]);
  const [showPhotos, setShowPhotos] = useState(false);

  const [customTotal, setCustomTotal] = useState<number | null>(null);
  const [editingCount, setEditingCount] = useState(false);
  const [countInput, setCountInput] = useState('');

  const [students, setStudents] = useState<any[]>([]);
  const [hourAttendance, setHourAttendance] = useState<Map<string, string>>(new Map());

  const [facultyList, setFacultyList] = useState<any[]>([]);
  const [newFacName, setNewFacName] = useState('');
  const [newFacDept, setNewFacDept] = useState('');
  const [newFacCode, setNewFacCode] = useState('');
  const [showManager, setShowManager] = useState(false);

  const classKey = `${filterCourse}_${filterClass}_${filterSection}_${filterYear}`;

  const handleStaffLogin = async () => {
    if (!staffCode.trim() || !staffName.trim() || !staffSubject.trim()) {
      return setLoginError('Enter your Staff Credential Code, Name, and Subject.');
    }

    const cleanCode = staffCode.toUpperCase().trim();
    const { data: fac } = await supabase
      .from('faculty_access')
      .select('*')
      .eq('access_code', cleanCode)
      .eq('is_active', true)
      .single();

    if (!fac) {
      return setLoginError('❌ Invalid or inactive Staff Credential Code.');
    }

    await supabase.from('staff_sessions').upsert(
      [
        {
          access_code: cleanCode,
          faculty_name: staffName.trim(),
          subject_name: staffSubject.trim(),
          hour_no: staffHour,
          is_open: true,
        },
      ],
      { onConflict: 'access_code' }
    );

    setSelectedHour(staffHour);
    setRole('staff');
    setLoginError('');
  };

  const handleAdminLogin = () => {
    if (adminPin.trim() === MASTER_ADMIN_PIN) {
      setRole('admin');
      setLoginError('');
    } else {
      setLoginError('❌ Incorrect Master Admin PIN.');
    }
  };

  const handleTimetableSubjectChange = async () => {
    if (!newSubjectInput.trim()) return alert('Enter the new subject name!');
    const updatedSub = newSubjectInput.trim();
    setStaffSubject(updatedSub);

    await supabase
      .from('staff_sessions')
      .update({ subject_name: updatedSub, hour_no: selectedHour })
      .eq('access_code', staffCode.toUpperCase().trim());

    setEditingSubject(false);
    setNewSubjectInput('');
  };

  const saveCustomStudentCount = async () => {
    const num = parseInt(countInput, 10);
    if (isNaN(num) || num < 1) return alert('Enter a valid number of students (1 or more)!');

    await supabase
      .from('class_strength')
      .upsert([{ class_key: classKey, total_students: num }], { onConflict: 'class_key' });

    setCustomTotal(num);
    setEditingCount(false);
  };

  const resetToAutoCount = async () => {
    await supabase.from('class_strength').delete().eq('class_key', classKey);
    setCustomTotal(null);
    setEditingCount(false);
  };

  const fetchRosterAndAttendance = async () => {
    const todayStr = new Date().toISOString().slice(0, 10);

    const columns = showPhotos
      ? 'id, student_name, roll_no, course, student_class, section, year_of_study, photo_url'
      : 'id, student_name, roll_no, course, student_class, section, year_of_study';

    let query = supabase.from('students').select(columns).order('roll_no', { ascending: true });
    if (filterCourse !== 'ALL') query = query.eq('course', filterCourse);
    if (filterClass !== 'ALL') query = query.eq('student_class', filterClass);
    if (filterSection !== 'ALL') query = query.eq('section', filterSection);
    if (filterYear !== 'ALL') query = query.eq('year_of_study', filterYear);

    const { data: studentList } = await query;

    const { data: attList } = await supabase
      .from('daily_attendance')
      .select('roll_no, subject_name')
      .eq('attendance_date', todayStr)
      .eq('period_no', selectedHour);

    const { data: strengthData } = await supabase
      .from('class_strength')
      .select('total_students')
      .eq('class_key', classKey)
      .single();

    setCustomTotal(strengthData ? strengthData.total_students : null);
    setStudents(studentList || []);
    const map = new Map<string, string>();
    (attList || []).forEach((a) => map.set(a.roll_no, a.subject_name));
    setHourAttendance(map);

    if (role === 'admin') {
      const { data: facs } = await supabase
        .from('faculty_access')
        .select('*')
        .order('created_at', { ascending: false });
      setFacultyList(facs || []);
    }
  };

  useEffect(() => {
    if (role) fetchRosterAndAttendance();
  }, [role, filterCourse, filterClass, filterSection, filterYear, selectedHour, showPhotos]);

  const addFacultyPermission = async () => {
    if (!newFacName.trim() || !newFacCode.trim()) {
      return alert('Enter Faculty Name and Credential Code!');
    }
    const { error } = await supabase.from('faculty_access').insert([
      {
        faculty_name: newFacName.trim(),
        subject_class: newFacDept.trim() || 'All Classes',
        access_code: newFacCode.toUpperCase().trim(),
        is_active: true,
      },
    ]);
    if (error) return alert(`Error: ${error.message}`);
    setNewFacName('');
    setNewFacDept('');
    setNewFacCode('');
    fetchRosterAndAttendance();
  };

  const toggleFacultyStatus = async (id: number, currentStatus: boolean) => {
    await supabase.from('faculty_access').update({ is_active: !currentStatus }).eq('id', id);
    fetchRosterAndAttendance();
  };

  const handleLogout = () => {
    setRole(null);
    setAdminPin('');
    setStaffCode('');
    setEditingSubject(false);
    setEditingCount(false);
  };

  if (!role) {
    return (
      <main className="min-h-screen bg-gradient-to-br from-slate-950 via-indigo-950 to-slate-900 text-white p-6 flex flex-col items-center justify-center">
        <div className="w-full max-w-md mb-4">
          <Link href="/" className="text-xs text-slate-400 hover:text-white">← Back to Home</Link>
        </div>

        <div className="w-full max-w-md bg-slate-900/90 backdrop-blur p-7 rounded-3xl border border-slate-800 space-y-5 shadow-2xl">
          <div className="grid grid-cols-2 bg-slate-800 p-1 rounded-xl text-sm font-semibold">
            <button
              onClick={() => { setLoginTab('staff'); setLoginError(''); }}
              className={`py-2 rounded-lg transition ${loginTab === 'staff' ? 'bg-indigo-500 text-white' : 'text-slate-400'}`}
            >
              👨‍🏫 Staff Class Login
            </button>
            <button
              onClick={() => { setLoginTab('admin'); setLoginError(''); }}
              className={`py-2 rounded-lg transition ${loginTab === 'admin' ? 'bg-purple-600 text-white' : 'text-slate-400'}`}
            >
              🛡️ Admin Login
            </button>
          </div>

          {loginTab === 'staff' ? (
            <div className="space-y-3">
              <h1 className="text-xl font-bold text-center">Faculty Class Check-In</h1>
              <p className="text-xs text-slate-400 text-center">
                Enter your pre-authorized Staff Code along with your Name, Subject & Class Hour.
              </p>
              <input
                type="text"
                placeholder="Staff Credential Code (e.g., RAO101)"
                value={staffCode}
                onChange={(e) => setStaffCode(e.target.value)}
                className="w-full p-3 rounded-xl bg-slate-800 border border-slate-700 text-sm uppercase"
              />
              <input
                type="text"
                placeholder="Your Full Name (e.g., Prof. K. Rao)"
                value={staffName}
                onChange={(e) => setStaffName(e.target.value)}
                className="w-full p-3 rounded-xl bg-slate-800 border border-slate-700 text-sm"
              />
              <input
                type="text"
                placeholder="Subject Name (e.g., Operating Systems)"
                value={staffSubject}
                onChange={(e) => setStaffSubject(e.target.value)}
                className="w-full p-3 rounded-xl bg-slate-800 border border-slate-700 text-sm"
              />
              <div>
                <label className="text-xs text-slate-400 block mb-1">Current Class Hour</label>
                <select
                  value={staffHour}
                  onChange={(e) => setStaffHour(e.target.value)}
                  className="w-full p-3 rounded-xl bg-slate-800 border border-slate-700 text-sm"
                >
                  {HOURS.map((h) => (
                    <option key={h} value={h}>{h}</option>
                  ))}
                </select>
              </div>
              <button
                onClick={handleStaffLogin}
                className="w-full bg-indigo-500 hover:bg-indigo-400 py-3.5 rounded-xl font-bold shadow-lg shadow-indigo-500/20"
              >
                Login & Open Class Dashboard
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              <h1 className="text-xl font-bold text-center">Master Admin Portal</h1>
              <p className="text-xs text-slate-400 text-center">
                Manage pre-authorized faculty credentials, class student counts, and attendance.
              </p>
              <input
                type="password"
                placeholder="Enter Master Admin PIN"
                value={adminPin}
                onChange={(e) => setAdminPin(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAdminLogin()}
                className="w-full p-3.5 rounded-xl bg-slate-800 border border-slate-700 text-center tracking-widest"
              />
              <button
                onClick={handleAdminLogin}
                className="w-full bg-purple-600 hover:bg-purple-500 py-3.5 rounded-xl font-bold"
              >
                Unlock Admin Dashboard
              </button>
            </div>
          )}

          {loginError && <p className="text-center text-red-400 text-xs font-medium">{loginError}</p>}
        </div>
      </main>
    );
  }

  const presentCount = students.filter((s) => hourAttendance.has(s.roll_no)).length;
  const totalClassStrength = customTotal !== null ? customTotal : students.length;
  const absentCount = Math.max(0, totalClassStrength - presentCount);
  const percentage = totalClassStrength > 0 ? Math.round((presentCount / totalClassStrength) * 100) : 0;

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-950 via-indigo-950 to-slate-900 text-white p-6 flex flex-col items-center">
      <div className="w-full max-w-5xl">
        <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-5 mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-bold uppercase px-2.5 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300">
                {role === 'admin' ? '🛡️ Master Admin' : `👨‍🏫 ${staffName}`}
              </span>
              {role === 'staff' && (
                <span className="text-xs bg-emerald-500/20 text-emerald-300 px-2.5 py-0.5 rounded-full font-semibold">
                  Subject: {staffSubject}
                </span>
              )}
            </div>

            <h1 className="text-2xl font-bold mt-2">{selectedHour}</h1>

            <div className="flex flex-wrap items-center gap-3 mt-2 text-sm">
              <span className="bg-emerald-500/20 text-emerald-300 px-3 py-1 rounded-lg font-semibold">
                Present: {presentCount} / {totalClassStrength} ({percentage}%)
              </span>
              <span className="bg-red-500/20 text-red-300 px-3 py-1 rounded-lg font-semibold">
                Absent: {absentCount}
              </span>
              <button
                onClick={() => {
                  setEditingCount(!editingCount);
                  setCountInput(String(totalClassStrength));
                }}
                className="bg-slate-800 hover:bg-slate-700 border border-slate-600 text-xs px-3 py-1.5 rounded-lg font-semibold text-indigo-300"
              >
                ✏️ Edit Total Students ({customTotal !== null ? 'Custom' : 'Auto'})
              </button>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            {role === 'staff' && (
              <button
                onClick={() => { setEditingSubject(!editingSubject); setNewSubjectInput(staffSubject); }}
                className="bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/30 px-3.5 py-2 rounded-xl text-xs font-semibold"
              >
                🔄 Change Subject
              </button>
            )}
            {role === 'admin' && (
              <button
                onClick={() => setShowManager(!showManager)}
                className="bg-purple-600 hover:bg-purple-500 px-3.5 py-2 rounded-xl text-xs font-semibold"
              >
                {showManager ? 'Hide Staff Access' : '🔑 Manage Staff Access'}
              </button>
            )}
            <button
              onClick={() => setShowPhotos(!showPhotos)}
              className="bg-slate-800 hover:bg-slate-700 px-3.5 py-2 rounded-xl text-xs font-semibold"
            >
              {showPhotos ? '🙈 Hide Photos' : '📸 Show Photos'}
            </button>
            <button
              onClick={fetchRosterAndAttendance}
              className="bg-indigo-600 hover:bg-indigo-500 px-3.5 py-2 rounded-xl text-xs font-semibold"
            >
              Refresh
            </button>
            <button
              onClick={handleLogout}
              className="bg-red-500/20 hover:bg-red-500/30 text-red-300 border border-red-500/30 px-3.5 py-2 rounded-xl text-xs font-semibold"
            >
              Logout
            </button>
          </div>
        </div>

        {editingCount && (
          <div className="bg-indigo-500/10 border border-indigo-400/30 rounded-2xl p-4 mb-6 flex flex-col sm:flex-row gap-3 items-center">
            <div className="text-xs text-indigo-200 flex-1">
              Set total students for <strong>{filterCourse} • {filterClass} • Sec {filterSection} • {filterYear}</strong>:
            </div>
            <input
              type="number"
              min={1}
              placeholder="e.g., 65"
              value={countInput}
              onChange={(e) => setCountInput(e.target.value)}
              className="w-full sm:w-32 p-2.5 rounded-xl bg-slate-900 border border-slate-700 text-sm text-center font-bold"
            />
            <button
              onClick={saveCustomStudentCount}
              className="bg-indigo-500 hover:bg-indigo-400 text-white px-4 py-2.5 rounded-xl font-bold text-xs w-full sm:w-auto"
            >
              Save Count
            </button>
            {customTotal !== null && (
              <button
                onClick={resetToAutoCount}
                className="bg-slate-800 hover:bg-slate-700 text-slate-300 px-3 py-2.5 rounded-xl text-xs w-full sm:w-auto"
              >
                Reset to Auto
              </button>
            )}
          </div>
        )}

        {role === 'staff' && editingSubject && (
          <div className="bg-amber-500/10 border border-amber-500/30 rounded-2xl p-4 mb-6 flex flex-col sm:flex-row gap-3 items-center">
            <input
              type="text"
              placeholder="Enter Updated Subject Name (Timetable Change)"
              value={newSubjectInput}
              onChange={(e) => setNewSubjectInput(e.target.value)}
              className="flex-1 w-full p-2.5 rounded-xl bg-slate-900 border border-slate-700 text-sm"
            />
            <button
              onClick={handleTimetableSubjectChange}
              className="bg-amber-500 text-slate-950 px-5 py-2.5 rounded-xl font-bold text-sm w-full sm:w-auto"
            >
              Save New Subject
            </button>
          </div>
        )}

        {role === 'admin' && showManager && (
          <div className="bg-slate-900 p-5 rounded-3xl border border-purple-500/40 mb-6 space-y-4">
            <h2 className="font-bold text-lg text-purple-300">Authorize Faculty Credentials Before Class (Optional)</h2>
            <div className="grid sm:grid-cols-4 gap-2">
              <input
                type="text"
                placeholder="Faculty Name"
                value={newFacName}
                onChange={(e) => setNewFacName(e.target.value)}
                className="p-2.5 rounded-xl bg-slate-800 border border-slate-700 text-sm"
              />
              <input
                type="text"
                placeholder="Department / Notes"
                value={newFacDept}
                onChange={(e) => setNewFacDept(e.target.value)}
                className="p-2.5 rounded-xl bg-slate-800 border border-slate-700 text-sm"
              />
              <input
                type="text"
                placeholder="Credential Code (e.g., RAO101)"
                value={newFacCode}
                onChange={(e) => setNewFacCode(e.target.value)}
                className="p-2.5 rounded-xl bg-slate-800 border border-slate-700 text-sm uppercase"
              />
              <button
                onClick={addFacultyPermission}
                className="bg-purple-600 hover:bg-purple-500 rounded-xl font-semibold text-sm py-2.5"
              >
                + Grant Access
              </button>
            </div>

            {facultyList.length > 0 && (
              <div className="space-y-2 pt-2">
                {facultyList.map((f) => (
                  <div key={f.id} className="bg-slate-800 p-3 rounded-xl flex items-center justify-between text-sm">
                    <div>
                      <span className="font-bold">{f.faculty_name}</span>{' '}
                      <span className="text-slate-400">({f.subject_class})</span> • Code:{' '}
                      <span className="font-mono text-purple-300 font-bold">{f.access_code}</span>
                    </div>
                    <button
                      onClick={() => toggleFacultyStatus(f.id, f.is_active)}
                      className={`px-3 py-1 rounded-lg text-xs font-semibold ${
                        f.is_active ? 'bg-emerald-600 text-white' : 'bg-slate-700 text-slate-300'
                      }`}
                    >
                      {f.is_active ? 'Active (Revoke)' : 'Inactive (Enable)'}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5 mb-6 bg-slate-900/90 p-4 rounded-2xl border border-slate-800">
          <select value={selectedHour} onChange={(e) => setSelectedHour(e.target.value)} className="p-2.5 rounded-xl bg-indigo-950 border border-indigo-700 text-xs font-semibold col-span-2 sm:col-span-1">
            {HOURS.map((h) => (
              <option key={h} value={h}>{h}</option>
            ))}
          </select>
          <select value={filterCourse} onChange={(e) => setFilterCourse(e.target.value)} className="p-2.5 rounded-xl bg-slate-800 border border-slate-700 text-xs">
            <option value="ALL">All Courses</option>
            <option value="B.Tech">B.Tech</option>
            <option value="M.Tech">M.Tech</option>
            <option value="B.Sc">B.Sc</option>
            <option value="BBA">BBA</option>
            <option value="MBA">MBA</option>
            <option value="MCA">MCA</option>
          </select>
          <select value={filterClass} onChange={(e) => setFilterClass(e.target.value)} className="p-2.5 rounded-xl bg-slate-800 border border-slate-700 text-xs">
            <option value="ALL">All Branches</option>
            <option value="CSE">CSE</option>
            <option value="ECE">ECE</option>
            <option value="EEE">EEE</option>
            <option value="MECH">MECH</option>
            <option value="CIVIL">CIVIL</option>
            <option value="IT">IT</option>
            <option value="AIML">AIML</option>
          </select>
          <select value={filterSection} onChange={(e) => setFilterSection(e.target.value)} className="p-2.5 rounded-xl bg-slate-800 border border-slate-700 text-xs">
            <option value="ALL">All Sections</option>
            <option value="A">Section A</option>
            <option value="B">Section B</option>
            <option value="C">Section C</option>
            <option value="D">Section D</option>
          </select>
          <select value={filterYear} onChange={(e) => setFilterYear(e.target.value)} className="p-2.5 rounded-xl bg-slate-800 border border-slate-700 text-xs">
            <option value="ALL">All Years</option>
            <option value="1st Year">1st Year</option>
            <option value="2nd Year">2nd Year</option>
            <option value="3rd Year">3rd Year</option>
            <option value="4th Year">4th Year</option>
          </select>
        </div>

        <div className="space-y-2.5">
          {students.length === 0 && (
            <p className="text-center text-slate-500 py-10">No registered students found for this filter.</p>
          )}
          {students.map((s) => {
            const subjectMarked = hourAttendance.get(s.roll_no);
            return (
              <div key={s.id} className="bg-slate-900/90 p-4 rounded-2xl border border-slate-800 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  {showPhotos && s.photo_url && (
                    <img src={s.photo_url} alt={s.student_name} className="w-12 h-12 rounded-full object-cover border border-slate-600" />
                  )}
                  <div>
                    <p className="font-bold">{s.student_name}</p>
                    <p className="text-xs text-slate-400">
                      {s.roll_no} • {s.course || 'B.Tech'} ({s.student_class} - Sec {s.section}) • {s.year_of_study}
                    </p>
                  </div>
                </div>
                <span className={`text-xs font-semibold px-3 py-1 rounded-full ${subjectMarked ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'}`}>
                  {subjectMarked ? `Present (${subjectMarked})` : 'Absent'}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </main>
  );
}
