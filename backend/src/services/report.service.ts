import prisma from '../config/prisma';
import { transporter } from '../config/mail';

/**
 * Time Window Check:
 * Active Saturday 6:00 PM (18:00) until Monday 9:00 AM (09:00).
 */
export function checkSaturdayWindowStatus(overrideDate?: Date): {
  active: boolean;
  message: string;
  windowStart: string;
  windowEnd: string;
} {
  const now = overrideDate || new Date();
  const day = now.getDay(); // 0 = Sunday, 1 = Monday, 6 = Saturday
  const hour = now.getHours();

  let active = false;

  if (day === 6 && hour >= 18) {
    active = true; // Saturday 6:00 PM onwards
  } else if (day === 0) {
    active = true; // All day Sunday
  } else if (day === 1 && hour < 9) {
    active = true; // Monday before 9:00 AM
  }

  return {
    active,
    message: active
      ? 'Saturday Weekly Audit Report download window is ACTIVE (Sat 6:00 PM – Mon 9:00 AM).'
      : 'Saturday Weekly Audit Report is available every Saturday 6:00 PM to Monday 9:00 AM.',
    windowStart: 'Saturday 6:00 PM',
    windowEnd: 'Monday 9:00 AM'
  };
}

/**
 * Calculates current week's Monday to Saturday dates.
 */
export function getCurrentWeekDates(refDate: Date = new Date()) {
  const current = new Date(refDate);
  const dayOfWeek = current.getDay(); // 0 = Sun, 1 = Mon, ..., 6 = Sat
  const distanceToMonday = (dayOfWeek + 6) % 7; // Days to subtract to get Monday

  const monday = new Date(current);
  monday.setDate(current.getDate() - distanceToMonday);
  monday.setHours(0, 0, 0, 0);

  const daysInfo: { dayName: string; shortDateStr: string; isoDateStr: string; dateObj: Date }[] = [];
  const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  for (let i = 0; i < 6; i++) {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    const isoDateStr = d.toISOString().split('T')[0]; // e.g. "2026-08-10"
    const dayNum = String(d.getDate()).padStart(2, '0');
    const monthNum = String(d.getMonth() + 1).padStart(2, '0');
    const shortDateStr = `${dayNum}/${monthNum}`; // e.g. "10/08"

    daysInfo.push({
      dayName: days[i],
      shortDateStr,
      isoDateStr,
      dateObj: d
    });
  }

  return daysInfo;
}

/**
 * Queries all Field Agents, assigned Workers, wage details, and synchronizes Monday-Saturday attendance logs from prisma.attendance.
 */
export async function generateSaturdayWeeklyReportData(refDate: Date = new Date()) {
  const weekDays = getCurrentWeekDates(refDate);

  // Fetch all Field Agents
  const agents: any[] = await prisma.user.findMany({
    where: { role: 'AGENT' },
    include: { site: true }
  });

  // Fetch all Workers
  const workers: any[] = await prisma.user.findMany({
    where: { role: 'WORKER' },
    include: { assignedAgent: true, site: true }
  });

  // Fetch attendance logs for the current week
  const attendanceLogs: any[] = await prisma.attendance.findMany({
    take: 1000,
    orderBy: { date: 'desc' }
  });

  const reportRows: any[] = [];

  for (const agent of agents) {
    const agentWorkers = workers.filter(
      (w) => w.assignedAgentId === agent.id || w.assignedAgent?.name === agent.name
    );

    const agentSite = agent.siteName || agent.site?.siteName || agent.site?.name || 'Industrial Area Site';

    if (agentWorkers.length === 0) {
      reportRows.push({
        agentName: agent.name,
        agentCode: agent.employeeCode || `AGT-${agent.id}`,
        agentPhone: agent.phone || 'N/A',
        siteName: agentSite,
        workerName: 'No Assigned Worker',
        workerCode: 'N/A',
        designation: 'N/A',
        dailyWage: 0,
        dayStatuses: weekDays.map((d) => ({
          dayName: d.dayName,
          shortDateStr: d.shortDateStr,
          status: 'N/A'
        })),
        totalPresentDays: 0,
        totalEarnedWage: 0,
        weekDays
      });
    } else {
      for (const worker of agentWorkers) {
        const workerLogs = attendanceLogs.filter(
          (a) => a.workerId === worker.id || (a.worker && a.worker.id === worker.id)
        );

        const wageRate = worker.dailyWage || Math.round((worker.salary || 18000) / 26) || 850;

        let presentWeightTotal = 0;
        const dayStatuses: { dayName: string; shortDateStr: string; status: string }[] = [];

        const nowIsoStr = new Date().toISOString().split('T')[0];

        for (const dayInfo of weekDays) {
          // Look up matching database attendance log for this worker on this date
          const match = workerLogs.find((a) => {
            if (!a.date) return false;
            const logDateIso = new Date(a.date).toISOString().split('T')[0];
            return logDateIso === dayInfo.isoDateStr;
          });

          let status = 'UNMARKED';

          if (match) {
            status = String(match.status || 'PRESENT').toUpperCase();
          } else if (dayInfo.isoDateStr > nowIsoStr) {
            status = 'PENDING';
          } else {
            status = 'ABSENT'; // Default for past days with no attendance entry
          }

          if (status === 'PRESENT') {
            presentWeightTotal += 1.0;
          } else if (status === 'HALF_DAY') {
            presentWeightTotal += 0.5;
          }

          dayStatuses.push({
            dayName: dayInfo.dayName,
            shortDateStr: dayInfo.shortDateStr,
            status
          });
        }

        const totalEarnedWage = presentWeightTotal * wageRate;

        reportRows.push({
          agentName: agent.name,
          agentCode: agent.employeeCode || `AGT-${agent.id}`,
          agentPhone: agent.phone || 'N/A',
          siteName: worker.siteName || worker.site?.siteName || agentSite,
          workerName: worker.name,
          workerCode: worker.employeeCode || `WRK-${worker.id}`,
          designation: worker.designation || 'Construction Worker',
          dailyWage: wageRate,
          dayStatuses,
          totalPresentDays: presentWeightTotal,
          totalEarnedWage,
          weekDays
        });
      }
    }
  }

  return { rows: reportRows, weekDays };
}

/**
 * Formats report rows into CSV string format with date headers.
 */
export async function generateSaturdayWeeklyCsv(refDate: Date = new Date()): Promise<string> {
  const { rows, weekDays } = await generateSaturdayWeeklyReportData(refDate);

  const dayHeaders = weekDays.map((d) => `"${d.dayName} (${d.shortDateStr})"`);

  const headers = [
    'Agent Name',
    'Agent Code',
    'Agent Phone',
    'Site Name',
    'Worker Name',
    'Worker Code',
    'Designation',
    'Daily Wage (INR)',
    ...dayHeaders,
    'Total Days Present',
    'Weekly Earned Wage (INR)'
  ];

  const csvLines = [headers.join(',')];

  for (const r of rows) {
    const statuses = r.dayStatuses.map((d: any) => `"${d.status}"`);

    const line = [
      `"${r.agentName.replace(/"/g, '""')}"`,
      `"${r.agentCode}"`,
      `"${r.agentPhone}"`,
      `"${r.siteName.replace(/"/g, '""')}"`,
      `"${r.workerName.replace(/"/g, '""')}"`,
      `"${r.workerCode}"`,
      `"${r.designation}"`,
      r.dailyWage,
      ...statuses,
      r.totalPresentDays,
      r.totalEarnedWage
    ].join(',');
    csvLines.push(line);
  }

  return csvLines.join('\n');
}

/**
 * Sends Saturday Weekly Audit Excel/CSV report email to Super Agent.
 */
export async function sendSaturdayWeeklyReportEmail(targetEmail: string) {
  const csvContent = await generateSaturdayWeeklyCsv();
  const dateStr = new Date().toLocaleDateString('en-IN', {
    weekday: 'long',
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });

  const subject = `📊 Weekly Audit Report (${dateStr}) - Labor Union Management`;
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #E2E8F0; border-radius: 12px; background-color: #FFFFFF;">
      <h2 style="color: #2563EB; margin-top: 0;">Weekly Saturday Audit Report</h2>
      <p style="color: #475569; font-size: 14px;">
        Attached is the complete <strong>Saturday Weekly Audit Excel Report</strong> containing live database attendance logs, assigned worker rosters, daily wages, and date-stamped Mon-Sat attendance records.
      </p>
      
      <div style="background-color: #F8FAFC; border: 1px solid #CBD5E1; padding: 16px; border-radius: 8px; margin: 20px 0;">
        <span style="font-weight: bold; color: #0F172A; display: block; margin-bottom: 6px;">Report Summary (${dateStr}):</span>
        <ul style="margin: 0; padding-left: 20px; color: #334155; font-size: 13px;">
          <li>Automated Delivery: Every Saturday 6:00 PM</li>
          <li>Dashboard Availability: Saturday 6:00 PM to Monday 9:00 AM</li>
          <li>Database Synced: Mapped against prisma.attendance records</li>
          <li>Format: CSV / Excel Spreadsheet Attachment</li>
        </ul>
      </div>

      <p style="color: #64748B; font-size: 12px; margin-bottom: 0;">
        Labor Union Management System • Automated Audit Notification
      </p>
    </div>
  `;

  const info = await transporter.sendMail({
    from: `"Labor Union Management" <${process.env.EMAIL_USER || "satishgoudarcr@gmail.com"}>`,
    to: targetEmail,
    subject,
    html,
    attachments: [
      {
        filename: `Saturday_Weekly_Audit_Report_${new Date().toISOString().split('T')[0]}.csv`,
        content: csvContent,
        contentType: 'text/csv'
      }
    ]
  });

  console.log(`✅ Weekly Saturday Excel Report email sent successfully to ${targetEmail}! ID: ${info.messageId}`);
  return { success: true, emailSentTo: targetEmail, messageId: info.messageId };
}
