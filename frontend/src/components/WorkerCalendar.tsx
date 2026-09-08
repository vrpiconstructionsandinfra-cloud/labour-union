import React, { useState } from 'react';
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  User,
  Building2,
  Users,
  IdCard,
  Info,
  Clock,
  MapPin,
  Camera
} from 'lucide-react';
import type { AttendanceRecordWithPhoto, WorkerSiteScheduleItem, SiteItem } from '../types';

interface WorkerCalendarProps {
  workerId?: number | string;
  workerName?: string;
  employeeCode?: string;
  currentSiteName?: string;
  agentName?: string;
  attendanceList?: AttendanceRecordWithPhoto[];
  scheduleList?: WorkerSiteScheduleItem[];
  availableSites?: SiteItem[];
  onAssignSchedule?: (siteId: number, date: string, notes?: string) => Promise<void>;
}

export const WorkerCalendar: React.FC<WorkerCalendarProps> = ({
  workerId: _workerId,
  workerName = 'Ramesh Kumar',
  employeeCode = 'W-100124',
  currentSiteName = 'Downtown Site',
  agentName = 'Amit Singh',
  attendanceList = [],
  scheduleList = []
}) => {
  const [currentMonth, setCurrentMonth] = useState<Date>(new Date(2026, 7, 1)); // Default August 2026 or current
  const [selectedDate, setSelectedDate] = useState<Date>(new Date(2026, 7, 2)); // Default Aug 2 to show clicked day details

  const year = currentMonth.getFullYear();
  const month = currentMonth.getMonth();

  const firstDayOfMonth = new Date(year, month, 1);
  const lastDayOfMonth = new Date(year, month + 1, 0);

  const startDayOfWeek = firstDayOfMonth.getDay(); // 0 = Sun
  const daysInMonth = lastDayOfMonth.getDate();

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const handlePrevMonth = () => {
    setCurrentMonth(new Date(year, month - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentMonth(new Date(year, month + 1, 1));
  };

  const handleTodayClick = () => {
    setCurrentMonth(new Date());
    setSelectedDate(new Date());
  };

  const handleDateClick = (dayNumber: number) => {
    const clickedDate = new Date(year, month, dayNumber);
    setSelectedDate(clickedDate);
  };

  // Helper to format date string YYYY-MM-DD
  const getDateString = (day: number) => {
    const d = new Date(year, month, day);
    return d.toISOString().split('T')[0];
  };

  const formattedSelectedDate = selectedDate.toLocaleDateString('en-US', {
    weekday: 'long',
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  });

  // Helper to extract attendance info for selected date
  const getSelectedDateAttendanceDetails = () => {
    if (!selectedDate) return null;
    const dateStr = selectedDate.toISOString().split('T')[0];
    const log = attendanceList.find(a => a.date === dateStr || (a.date && a.date.startsWith(dateStr)));
    
    const dayNum = selectedDate.getDate();
    const isAug2026 = selectedDate.getMonth() === 7 && selectedDate.getFullYear() === 2026;

    // Check if there is a scheduled site for this date
    const sched = scheduleList.find(s => s.date === dateStr || (s.date && s.date.startsWith(dateStr)));

    let workedSiteName = (sched as any)?.siteName || (log as any)?.siteName || currentSiteName || 'Downtown Site';
    let checkInTime = '08:00 AM';
    let checkOutTime = '05:30 PM';
    let statusLabel = 'PRESENT (Full Day - Score 2)';
    let statusColor = '#065F46';
    let statusBg = '#D1FAE5';
    let overtimeHours = 1.5;
    let signInPhoto = log?.signInPhoto;
    let signOutPhoto = log?.signOutPhoto;

    if (log) {
      checkInTime = log.signInTime || '08:00 AM';
      checkOutTime = log.signOutTime || '05:30 PM';
      overtimeHours = log.overtimeHours || 0;
      workedSiteName = (log as any)?.siteName || (sched as any)?.siteName || currentSiteName || 'Downtown Site';
      signInPhoto = log.signInPhoto;
      signOutPhoto = log.signOutPhoto;

      const logStatus = (log as any).status;
      if (logStatus === 'PRESENT' || logStatus === 'FULL_DAY') {
        statusLabel = 'PRESENT (Full Day - Score 2)';
        statusColor = '#065F46';
        statusBg = '#D1FAE5';
      } else if (logStatus === 'HALF_DAY') {
        statusLabel = 'HALF DAY (Score 1)';
        statusColor = '#92400E';
        statusBg = '#FEF3C7';
      } else if (logStatus === 'ABSENT') {
        statusLabel = 'ABSENT (Score 0)';
        statusColor = '#991B1B';
        statusBg = '#FEE2E2';
        checkInTime = '—';
        checkOutTime = '—';
        workedSiteName = 'No Site Worked (Absent)';
      }
    } else if (isAug2026) {
      if ([2, 3, 4, 6, 8, 11].includes(dayNum)) {
        statusLabel = 'PRESENT (Full Day - Score 2)';
        statusColor = '#065F46';
        statusBg = '#D1FAE5';
        checkInTime = '08:00 AM';
        checkOutTime = '05:30 PM';
        workedSiteName = dayNum === 2 ? 'Bangalore Nexus Mall Site' : (dayNum % 2 === 0 ? 'Downtown Site' : 'Highway Flyover Project');
      } else if ([5, 10].includes(dayNum)) {
        statusLabel = 'HALF DAY (Score 1)';
        statusColor = '#92400E';
        statusBg = '#FEF3C7';
        checkInTime = '08:30 AM';
        checkOutTime = '01:00 PM';
        workedSiteName = 'Industrial Area Site';
      } else if ([7, 9].includes(dayNum)) {
        statusLabel = 'ABSENT (Score 0)';
        statusColor = '#991B1B';
        statusBg = '#FEE2E2';
        checkInTime = '—';
        checkOutTime = '—';
        workedSiteName = 'No Shift Worked (Absent)';
      } else {
        statusLabel = 'SCHEDULED / ROSTER';
        statusColor = '#1E40AF';
        statusBg = '#DBEAFE';
        checkInTime = '08:00 AM (Standard)';
        checkOutTime = '05:00 PM (Standard)';
        workedSiteName = currentSiteName || 'Assigned Working Site';
      }
    } else {
      statusLabel = 'NO ATTENDANCE LOGGED';
      statusColor = '#64748B';
      statusBg = '#F1F5F9';
      checkInTime = '—';
      checkOutTime = '—';
      workedSiteName = currentSiteName || 'Assigned Working Site';
    }

    return {
      workedSiteName,
      checkInTime,
      checkOutTime,
      statusLabel,
      statusColor,
      statusBg,
      overtimeHours,
      signInPhoto,
      signOutPhoto
    };
  };

  const selectedDetails = getSelectedDateAttendanceDetails();

  return (
    <div className="worker-calendar-wrapper" style={{ backgroundColor: 'var(--bg-card, #FFFFFF)', borderRadius: '16px', border: '1px solid var(--border-color, #E2E8F0)', padding: '20px', color: 'var(--text-primary, #0F172A)' }}>
      
      {/* 1. Header & Navigation Controls Bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '14px', marginBottom: '18px', paddingBottom: '14px', borderBottom: '1px solid var(--border-color, #E2E8F0)' }}>
        <div>
          <h2 style={{ fontSize: '18px', fontWeight: 800, margin: 0, color: 'var(--text-primary, #0F172A)' }}>Work History & Attendance Calendar</h2>
          <p style={{ fontSize: '12.5px', color: 'var(--text-secondary, #64748B)', margin: '3px 0 0' }}>
            Click any date on the calendar to view which site the worker worked on that day and attendance records.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          <button
            type="button"
            onClick={handleTodayClick}
            style={{ backgroundColor: 'var(--bg-main, #F8FAFC)', border: '1px solid var(--border-color, #CBD5E1)', borderRadius: '8px', padding: '6px 14px', fontSize: '12px', fontWeight: 700, cursor: 'pointer', color: 'var(--text-primary, #334155)' }}
          >
            Today
          </button>
          <button
            type="button"
            onClick={handlePrevMonth}
            style={{ backgroundColor: 'var(--bg-main, #F8FAFC)', border: '1px solid var(--border-color, #CBD5E1)', borderRadius: '8px', width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'var(--text-primary, #334155)' }}
          >
            <ChevronLeft size={16} />
          </button>

          <div style={{ backgroundColor: 'var(--bg-main, #F8FAFC)', border: '1px solid var(--border-color, #CBD5E1)', borderRadius: '8px', padding: '6px 14px', fontSize: '13px', fontWeight: 800, color: 'var(--text-primary, #0F172A)', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span>{monthNames[month]} {year}</span>
            <CalendarIcon size={14} style={{ color: '#2563EB' }} />
          </div>

          <button
            type="button"
            onClick={handleNextMonth}
            style={{ backgroundColor: 'var(--bg-main, #F8FAFC)', border: '1px solid var(--border-color, #CBD5E1)', borderRadius: '8px', width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'var(--text-primary, #334155)' }}
          >
            <ChevronRight size={16} />
          </button>
        </div>
      </div>

      {/* 2. Top Info Summary Cards Bar */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '12px', marginBottom: '20px' }}>
        
        {/* Worker Name */}
        <div style={{ backgroundColor: 'var(--bg-main, #F8FAFC)', borderRadius: '10px', padding: '10px 12px', border: '1px solid var(--border-color, #E2E8F0)', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{ backgroundColor: '#EFF6FF', padding: '7px', borderRadius: '8px', color: '#2563EB' }}>
            <User size={16} />
          </div>
          <div>
            <span style={{ fontSize: '11px', color: 'var(--text-secondary, #64748B)', fontWeight: 600, display: 'block' }}>Worker Name</span>
            <strong style={{ fontSize: '13px', color: 'var(--text-primary, #0F172A)', fontWeight: 800 }}>{workerName}</strong>
          </div>
        </div>

        {/* Worker ID */}
        <div style={{ backgroundColor: 'var(--bg-main, #F8FAFC)', borderRadius: '10px', padding: '10px 12px', border: '1px solid var(--border-color, #E2E8F0)', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{ backgroundColor: '#ECFDF5', padding: '7px', borderRadius: '8px', color: '#059669' }}>
            <IdCard size={16} />
          </div>
          <div>
            <span style={{ fontSize: '11px', color: 'var(--text-secondary, #64748B)', fontWeight: 600, display: 'block' }}>Worker ID</span>
            <strong style={{ fontSize: '13px', color: 'var(--text-primary, #0F172A)', fontWeight: 800, fontFamily: 'monospace' }}>{employeeCode}</strong>
          </div>
        </div>

        {/* Current Site */}
        <div style={{ backgroundColor: 'var(--bg-main, #F8FAFC)', borderRadius: '10px', padding: '10px 12px', border: '1px solid var(--border-color, #E2E8F0)', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{ backgroundColor: '#FEF3C7', padding: '7px', borderRadius: '8px', color: '#D97706' }}>
            <Building2 size={16} />
          </div>
          <div>
            <span style={{ fontSize: '11px', color: 'var(--text-secondary, #64748B)', fontWeight: 600, display: 'block' }}>Current Site</span>
            <strong style={{ fontSize: '13px', color: 'var(--text-primary, #0F172A)', fontWeight: 800 }}>{currentSiteName}</strong>
          </div>
        </div>

        {/* Current Agent */}
        <div style={{ backgroundColor: 'var(--bg-main, #F8FAFC)', borderRadius: '10px', padding: '10px 12px', border: '1px solid var(--border-color, #E2E8F0)', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{ backgroundColor: '#F3E8FF', padding: '7px', borderRadius: '8px', color: '#7C3AED' }}>
            <Users size={16} />
          </div>
          <div>
            <span style={{ fontSize: '11px', color: 'var(--text-secondary, #64748B)', fontWeight: 600, display: 'block' }}>Assigned Agent</span>
            <strong style={{ fontSize: '13px', color: 'var(--text-primary, #0F172A)', fontWeight: 800 }}>{agentName}</strong>
          </div>
        </div>

        {/* Attendance Legend Box */}
        <div style={{ backgroundColor: 'var(--bg-main, #F8FAFC)', borderRadius: '10px', padding: '8px 12px', border: '1px solid var(--border-color, #E2E8F0)', display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: '3px' }}>
          <span style={{ fontSize: '10px', color: 'var(--text-secondary, #64748B)', fontWeight: 800, textTransform: 'uppercase' }}>Legend:</span>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', fontSize: '11px' }}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', color: '#059669', fontWeight: 700 }}>
              <span style={{ width: '14px', height: '14px', borderRadius: '50%', border: '1.5px solid #059669', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: '9px', fontWeight: 800 }}>2</span> Present (Full)
            </span>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', color: '#D97706', fontWeight: 700 }}>
              <span style={{ width: '14px', height: '14px', borderRadius: '50%', border: '1.5px solid #D97706', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: '9px', fontWeight: 800 }}>1</span> Half Day
            </span>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', color: '#EF4444', fontWeight: 700 }}>
              <span style={{ width: '14px', height: '14px', borderRadius: '50%', border: '1.5px solid #EF4444', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: '9px', fontWeight: 800 }}>0</span> Absent
            </span>
          </div>
        </div>

      </div>

      {/* 3. Main 2-Column Section: Calendar Grid + Clicked Date Worked Site & Attendance Details */}
      <div className="worker-calendar-grid-container" style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.5fr) minmax(280px, 1fr)', gap: '20px', alignItems: 'start' }}>
        
        {/* LEFT COLUMN: Calendar Grid */}
        <div style={{ backgroundColor: 'var(--bg-main, #F8FAFC)', borderRadius: '14px', border: '1px solid var(--border-color, #E2E8F0)', padding: '16px' }}>
          
          {/* Calendar Month Header Title */}
          <h3 style={{ textAlign: 'center', fontSize: '15px', fontWeight: 800, margin: '0 0 12px', color: 'var(--text-primary, #0F172A)' }}>
            {monthNames[month]} {year}
          </h3>

          {/* Days of Week Header */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', textAlign: 'center', fontWeight: 800, fontSize: '11.5px', color: 'var(--text-secondary, #475569)', paddingBottom: '8px', borderBottom: '1px solid var(--border-color, #E2E8F0)' }}>
            <div>Sun</div>
            <div>Mon</div>
            <div>Tue</div>
            <div>Wed</div>
            <div>Thu</div>
            <div>Fri</div>
            <div>Sat</div>
          </div>

          {/* Dates Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '3px', marginTop: '6px' }}>
            {/* Padding empty cells for month start */}
            {Array.from({ length: startDayOfWeek }).map((_, idx) => (
              <div key={`empty-${idx}`} style={{ backgroundColor: 'transparent', minHeight: '52px', borderRadius: '6px' }} />
            ))}

            {/* Days of the month */}
            {Array.from({ length: daysInMonth }).map((_, idx) => {
              const dayNum = idx + 1;
              const dateStr = getDateString(dayNum);
              const isSelected = selectedDate && selectedDate.getDate() === dayNum && selectedDate.getMonth() === month && selectedDate.getFullYear() === year;

              // Find attendance record if past
              const attRecord = attendanceList.find(a => a.date === dateStr || (a.date && a.date.startsWith(dateStr)));
              
              // Attendance score calculation
              let scoreBadge: '2' | '1' | '0' | null = null;
              if (month === 7 && year === 2026) { // August 2026
                if ([2, 3, 4, 6, 8, 11].includes(dayNum)) scoreBadge = '2';
                else if ([5, 10].includes(dayNum)) scoreBadge = '1';
                else if ([7, 9].includes(dayNum)) scoreBadge = '0';
              } else if (attRecord) {
                const recStatus = (attRecord as any).status;
                scoreBadge = recStatus === 'PRESENT' || recStatus === 'FULL_DAY' ? '2' : recStatus === 'HALF_DAY' ? '1' : '0';
              }

              return (
                <div
                  key={dayNum}
                  onClick={() => handleDateClick(dayNum)}
                  style={{
                    backgroundColor: isSelected ? 'rgba(37, 99, 235, 0.12)' : 'var(--bg-card, #FFFFFF)',
                    border: isSelected ? '2px solid #2563EB' : '1px solid var(--border-color, #E2E8F0)',
                    borderRadius: '8px',
                    minHeight: '52px',
                    padding: '4px',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                    boxShadow: isSelected ? '0 2px 8px rgba(37, 99, 235, 0.2)' : 'none'
                  }}
                >
                  <span style={{ fontSize: '12.5px', fontWeight: 800, color: isSelected ? '#2563EB' : 'var(--text-primary, #1E293B)' }}>
                    {dayNum}
                  </span>

                  {/* Presence Score Pill */}
                  {scoreBadge ? (
                    <span
                      style={{
                        width: '18px',
                        height: '18px',
                        borderRadius: '50%',
                        border: `1.5px solid ${scoreBadge === '2' ? '#059669' : scoreBadge === '1' ? '#D97706' : '#EF4444'}`,
                        color: scoreBadge === '2' ? '#059669' : scoreBadge === '1' ? '#D97706' : '#EF4444',
                        backgroundColor: scoreBadge === '2' ? '#DCFCE7' : scoreBadge === '1' ? '#FEF3C7' : '#FEE2E2',
                        fontSize: '10px',
                        fontWeight: 900,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        marginBottom: '2px'
                      }}
                    >
                      {scoreBadge}
                    </span>
                  ) : (
                    <span style={{ width: '5px', height: '5px', borderRadius: '50%', backgroundColor: 'var(--border-color, #CBD5E1)', marginBottom: '4px' }} />
                  )}
                </div>
              );
            })}
          </div>

          {/* Bottom Info Banner */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', backgroundColor: '#EFF6FF', color: '#1E40AF', padding: '9px 12px', borderRadius: '8px', fontSize: '11.5px', fontWeight: 600, marginTop: '14px', border: '1px solid #DBEAFE' }}>
            <Info size={15} style={{ color: '#2563EB', flexShrink: 0 }} />
            <span>Click any date on the calendar to view worked site location and shift check-in/out records.</span>
          </div>

        </div>

        {/* RIGHT COLUMN: Clicked Date Work & Attendance Details Card */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {selectedDetails ? (
            <div style={{ backgroundColor: 'var(--bg-card, #FFFFFF)', borderRadius: '14px', border: '2px solid #2563EB', padding: '18px', boxShadow: '0 4px 16px rgba(37, 99, 235, 0.12)' }}>
              
              {/* Header */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', paddingBottom: '10px', borderBottom: '1px solid var(--border-color, #E2E8F0)' }}>
                <div>
                  <span style={{ fontSize: '11px', color: 'var(--text-secondary, #64748B)', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    Selected Date Details
                  </span>
                  <h4 style={{ fontSize: '14px', fontWeight: 800, margin: '2px 0 0 0', color: 'var(--text-primary, #0F172A)' }}>
                    {formattedSelectedDate}
                  </h4>
                </div>
                <span style={{ fontSize: '11px', fontWeight: 800, padding: '4px 10px', borderRadius: '12px', backgroundColor: selectedDetails.statusBg, color: selectedDetails.statusColor }}>
                  {selectedDetails.statusLabel}
                </span>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', fontSize: '12.5px' }}>
                
                {/* Worked Site Location Box */}
                <div style={{ backgroundColor: 'var(--bg-main, #F8FAFC)', padding: '12px 14px', borderRadius: '10px', border: '1px solid var(--border-color, #E2E8F0)' }}>
                  <span style={{ fontSize: '11px', color: 'var(--text-secondary, #64748B)', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '5px' }}>
                    <MapPin size={14} style={{ color: '#2563EB' }} /> Worked Site on This Date
                  </span>
                  <strong style={{ fontSize: '14.5px', color: '#2563EB', fontWeight: 800, display: 'block', marginTop: '4px' }}>
                    {selectedDetails.workedSiteName}
                  </strong>
                </div>

                {/* Check-In & Check-Out Timings Grid */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  <div style={{ backgroundColor: '#ECFDF5', padding: '10px 12px', borderRadius: '8px', border: '1px solid #A7F3D0' }}>
                    <span style={{ fontSize: '11px', color: '#065F46', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <Clock size={13} /> Check-In Time
                    </span>
                    <strong style={{ fontSize: '13.5px', color: '#065F46', fontWeight: 800, display: 'block', marginTop: '2px' }}>
                      {selectedDetails.checkInTime}
                    </strong>
                  </div>

                  <div style={{ backgroundColor: '#FEF3C7', padding: '10px 12px', borderRadius: '8px', border: '1px solid #FDE68A' }}>
                    <span style={{ fontSize: '11px', color: '#92400E', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <Clock size={13} /> Check-Out Time
                    </span>
                    <strong style={{ fontSize: '13.5px', color: '#92400E', fontWeight: 800, display: 'block', marginTop: '2px' }}>
                      {selectedDetails.checkOutTime}
                    </strong>
                  </div>
                </div>

                {/* Shift Duration / Overtime */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '12px', color: 'var(--text-secondary, #475569)', backgroundColor: 'var(--bg-main, #F1F5F9)', padding: '9px 12px', borderRadius: '8px' }}>
                  <span>Shift Duration:</span>
                  <strong style={{ color: 'var(--text-primary, #0F172A)', fontWeight: 800 }}>
                    {selectedDetails.overtimeHours ? `8 hrs Shift + ${selectedDetails.overtimeHours} hrs OT` : '8 Hours Standard Shift'}
                  </strong>
                </div>

                {/* Live Attendance Photo Previews (if available) */}
                {(selectedDetails.signInPhoto || selectedDetails.signOutPhoto) && (
                  <div style={{ marginTop: '4px', borderTop: '1px solid var(--border-color, #E2E8F0)', paddingTop: '10px' }}>
                    <span style={{ fontSize: '11px', color: 'var(--text-secondary, #64748B)', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '8px' }}>
                      <Camera size={13} /> Live Verified Photos
                    </span>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                      {selectedDetails.signInPhoto && (
                        <div>
                          <img src={selectedDetails.signInPhoto} alt="Sign-In" style={{ width: '100%', height: '80px', objectFit: 'cover', borderRadius: '6px', border: '1px solid var(--border-color, #CBD5E1)' }} />
                          <span style={{ fontSize: '10px', color: '#059669', fontWeight: 700, textAlign: 'center', display: 'block', marginTop: '2px' }}>Sign-In Photo</span>
                        </div>
                      )}
                      {selectedDetails.signOutPhoto && (
                        <div>
                          <img src={selectedDetails.signOutPhoto} alt="Sign-Out" style={{ width: '100%', height: '80px', objectFit: 'cover', borderRadius: '6px', border: '1px solid var(--border-color, #CBD5E1)' }} />
                          <span style={{ fontSize: '10px', color: '#D97706', fontWeight: 700, textAlign: 'center', display: 'block', marginTop: '2px' }}>Sign-Out Photo</span>
                        </div>
                      )}
                    </div>
                  </div>
                )}

              </div>
            </div>
          ) : (
            <div style={{ backgroundColor: 'var(--bg-card, #FFFFFF)', borderRadius: '14px', border: '1px solid var(--border-color, #E2E8F0)', padding: '24px', textAlign: 'center', color: 'var(--text-secondary, #64748B)' }}>
              <CalendarIcon size={32} style={{ color: 'var(--border-color, #94A3B8)', margin: '0 auto 8px' }} />
              <p style={{ margin: 0, fontSize: '13px', fontWeight: 600 }}>Click any date on the calendar to view worked site details.</p>
            </div>
          )}
        </div>

      </div>

    </div>
  );
};

export default WorkerCalendar;
