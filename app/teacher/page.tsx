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

  // Staff Login Inputs
  const [staffCode, setStaffCode] = useState('');
  const [staffName, setStaffName] = useState('');
  const [staffSubject, setStaffSubject] = useState('');
  const [staffHour, setStaffHour] = useState(HOURS);
  const [editingSubject, setEditingSubject] = useState(false);
  const [newSubjectInput, setNewSubjectInput] = useState('');

  // Admin Login Input
  const [adminPin, setAdminPin] = useState('');

  // 5,000-Student Optimized Roster Filters
  const [filterCourse, setFilterCourse] = useState('B.Tech');
  const [filterClass, setFilterClass] = useState('CSE');
  const [filterSection, setFilterSection] = useState('A');
  const [filterYear, setFilterYear] = useState('1st Year');
  const [selectedHour, setSelectedHour] = useState(HOURS);
  const [showPhotos, setShowPhotos] = useState(false);

  // Editable Total Student Count State
  const [customTotal, setCustomTotal] = useState<number | null>(null);
  const [editingCount, setEditingCount] = useState(false);
  const [countInput, setCountInput] = useState('');

  const [students, setStudents] = useState<any[]>([]);
  const [hourAttendance, setHourAttendance] = useState<Map<string, string>>(new Map());

  // Admin: Pre-authorized Staff Manager
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

  // Dual Staff / Admin Login Screen
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
