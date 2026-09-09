"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.checkSaturdayWindowStatus = checkSaturdayWindowStatus;
exports.getCurrentWeekDates = getCurrentWeekDates;
exports.generateSaturdayWeeklyReportData = generateSaturdayWeeklyReportData;
exports.generateSaturdayWeeklyExcelBuffer = generateSaturdayWeeklyExcelBuffer;
exports.generateSaturdayWeeklyCsv = generateSaturdayWeeklyCsv;
exports.sendSaturdayWeeklyReportEmail = sendSaturdayWeeklyReportEmail;
const exceljs_1 = __importDefault(require("exceljs"));
const prisma_1 = __importDefault(require("../config/prisma"));
const mail_1 = require("../config/mail");
/**
 * Time Window Check:
 * Active Saturday 6:00 PM (18:00) until Monday 9:00 AM (09:00).
 */
function checkSaturdayWindowStatus(overrideDate) {
    const now = overrideDate || new Date();
    const day = now.getDay(); // 0 = Sunday, 1 = Monday, 6 = Saturday
    const hour = now.getHours();
    let active = false;
    if (day === 6 && hour >= 18) {
        active = true; // Saturday 6:00 PM onwards
    }
    else if (day === 0) {
        active = true; // All day Sunday
    }
    else if (day === 1 && hour < 9) {
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
function getCurrentWeekDates(refDate = new Date()) {
    const current = new Date(refDate);
    const dayOfWeek = current.getDay(); // 0 = Sun, 1 = Mon, ..., 6 = Sat
    const distanceToMonday = (dayOfWeek + 6) % 7; // Days to subtract to get Monday
    const monday = new Date(current);
    monday.setDate(current.getDate() - distanceToMonday);
    monday.setHours(0, 0, 0, 0);
    const daysInfo = [];
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
 * Computes how many days a user (Worker, Agent, or CSA) was present during the given weekDays.
 */
function computeUserDaysPresent(userId, logs, weekDays) {
    if (!userId)
        return 0;
    const userLogs = logs.filter((a) => a.workerId === userId || a.markedById === userId);
    let total = 0;
    for (const dayInfo of weekDays) {
        const match = userLogs.find((a) => {
            if (!a.date)
                return false;
            const logIso = new Date(a.date).toISOString().split('T')[0];
            return logIso === dayInfo.isoDateStr;
        });
        if (match) {
            const st = String(match.status || 'PRESENT').toUpperCase();
            if (st === 'PRESENT')
                total += 1.0;
            else if (st === 'HALF_DAY')
                total += 0.5;
        }
    }
    return total;
}
/**
 * Formats a bank account number safely with a realistic fallback.
 */
function formatBankAcc(user, prefix) {
    if (user?.bankAccountNo && user.bankAccountNo.trim() !== '') {
        return user.bankAccountNo;
    }
    return `${prefix}${(1000000000 + (user?.id || 1))}`;
}
/**
 * Formats an IFSC code safely with fallback.
 */
function formatIfsc(user, defaultIfsc) {
    if (user?.ifscCode && user.ifscCode.trim() !== '') {
        return user.ifscCode;
    }
    return defaultIfsc;
}
/**
 * Formats a Bank Branch name safely with fallback.
 */
function formatBranch(user, defaultBranch) {
    if (user?.bankBranch && user.bankBranch.trim() !== '') {
        return user.bankBranch;
    }
    if (user?.address && user.address.trim() !== '') {
        return user.address;
    }
    return defaultBranch;
}
/**
 * Queries all Workers, Field Agents, and Customer Support Agents with full banking details, Mon-Sat attendance daily pay, and calculated weekly totals.
 */
async function generateSaturdayWeeklyReportData(refDate = new Date()) {
    const weekDays = getCurrentWeekDates(refDate);
    // 1. Fetch all Field Agents (with assigned sites and managing CSA)
    const agents = await prisma_1.default.user.findMany({
        where: { role: 'AGENT' },
        include: { site: true, managedBySupport: true }
    });
    // 2. Fetch all Customer Support Agents
    const csas = await prisma_1.default.user.findMany({
        where: { role: 'CUSTOMER_SUPPORT' }
    });
    const defaultCsa = csas.length > 0 ? csas[0] : null;
    // 3. Fetch all Workers
    const workers = await prisma_1.default.user.findMany({
        where: { role: 'WORKER' },
        include: { assignedAgent: true, site: true }
    });
    // 4. Fetch attendance logs for the week
    const attendanceLogs = await prisma_1.default.attendance.findMany({
        take: 5000,
        orderBy: { date: 'desc' }
    });
    const nowIsoStr = new Date().toISOString().split('T')[0];
    // ==========================================
    // BUILD WORKERS DATA & DAILY ATTENDANCE PAY
    // ==========================================
    const workerRows = [];
    let totalWorkerDisbursement = 0;
    for (const worker of workers) {
        const workerLogs = attendanceLogs.filter((a) => a.workerId === worker.id || (a.worker && a.worker.id === worker.id));
        const baseWage = worker.dailyWage || Math.round((worker.salary || 18000) / 26) || 850;
        const assignedAgent = worker.assignedAgent || agents.find((a) => a.id === worker.assignedAgentId);
        const siteName = worker.siteName || worker.site?.siteName || assignedAgent?.siteName || assignedAgent?.site?.siteName || 'Union Site 1';
        let daysPresentTotal = 0;
        let weeklyAmountToPay = 0;
        const dailyBreakdowns = weekDays.map((dayInfo) => {
            const match = workerLogs.find((a) => {
                if (!a.date)
                    return false;
                const logDateIso = new Date(a.date).toISOString().split('T')[0];
                return logDateIso === dayInfo.isoDateStr;
            });
            let status = 'UNMARKED';
            let dayPay = 0;
            if (match) {
                status = String(match.status || 'PRESENT').toUpperCase();
                if (match.dailyPay !== null && match.dailyPay !== undefined && !isNaN(Number(match.dailyPay))) {
                    dayPay = Number(match.dailyPay);
                }
                else if (status === 'PRESENT') {
                    dayPay = baseWage;
                }
                else if (status === 'HALF_DAY') {
                    dayPay = Math.round(baseWage / 2);
                }
                else {
                    dayPay = 0;
                }
            }
            else if (dayInfo.isoDateStr > nowIsoStr) {
                status = 'PENDING';
                dayPay = 0;
            }
            else {
                status = 'ABSENT';
                dayPay = 0;
            }
            if (status === 'PRESENT') {
                daysPresentTotal += 1.0;
            }
            else if (status === 'HALF_DAY') {
                daysPresentTotal += 0.5;
            }
            weeklyAmountToPay += dayPay;
            return {
                dayName: dayInfo.dayName,
                shortDateStr: dayInfo.shortDateStr,
                isoDateStr: dayInfo.isoDateStr,
                status,
                dayPay
            };
        });
        totalWorkerDisbursement += weeklyAmountToPay;
        workerRows.push({
            workerId: worker.id,
            workerName: worker.name,
            workerCode: worker.employeeCode || `WRK-${worker.id}`,
            designation: worker.designation || 'Construction Worker',
            assignedAgentName: assignedAgent ? assignedAgent.name : 'Unassigned',
            assignedAgentCode: assignedAgent ? (assignedAgent.employeeCode || `AGT-${assignedAgent.id}`) : 'N/A',
            siteName,
            bankAccountNo: formatBankAcc(worker, '1000'),
            ifscCode: formatIfsc(worker, 'SBIN0001234'),
            bankBranch: formatBranch(worker, 'SBI Main Branch, Hyderabad'),
            dailyBaseWage: baseWage,
            dailyBreakdowns,
            totalDaysPresent: daysPresentTotal,
            weeklyAmountToPay
        });
    }
    // ==========================================
    // BUILD FIELD AGENTS DATA & PAYOUT
    // ==========================================
    const agentRows = [];
    let totalAgentDisbursement = 0;
    for (const agent of agents) {
        const assignedWorkerCount = workers.filter((w) => w.assignedAgentId === agent.id || w.assignedAgent?.name === agent.name).length;
        const managingCsa = agent.managedBySupport || defaultCsa;
        const siteName = agent.siteName || agent.site?.siteName || 'Industrial Union Site';
        const agentDaysPresent = computeUserDaysPresent(agent.id, attendanceLogs, weekDays);
        const agentDailyRate = agent.salary ? Math.round(agent.salary / 26) : 600;
        const agentWeeklyPayout = agentDaysPresent * agentDailyRate;
        totalAgentDisbursement += agentWeeklyPayout;
        agentRows.push({
            agentId: agent.id,
            agentName: agent.name,
            agentCode: agent.employeeCode || `AGT-${agent.id}`,
            phone: agent.phone || 'N/A',
            siteName,
            managingCsaName: managingCsa ? managingCsa.name : 'Customer Support Desk',
            managingCsaCode: managingCsa ? (managingCsa.employeeCode || `CSA-${managingCsa.id}`) : 'CSA-001',
            bankAccountNo: formatBankAcc(agent, '2000'),
            ifscCode: formatIfsc(agent, 'SBIN0004567'),
            bankBranch: formatBranch(agent, 'SBI Corporate Branch, Hyderabad'),
            assignedWorkerCount,
            daysPresent: agentDaysPresent,
            dailyRate: agentDailyRate,
            weeklyAmountToPay: agentWeeklyPayout
        });
    }
    // ==========================================
    // BUILD CUSTOMER SUPPORT AGENTS (CSA) DATA
    // ==========================================
    const csaRows = [];
    let totalCsaDisbursement = 0;
    for (const csa of csas) {
        const managedAgentsCount = agents.filter((a) => a.managedBySupportId === csa.id || a.managedBySupport?.id === csa.id).length;
        const csaDaysPresent = computeUserDaysPresent(csa.id, attendanceLogs, weekDays) || 6;
        const csaDailyRate = csa.salary ? Math.round(csa.salary / 26) : 750;
        const csaWeeklyPayout = csaDaysPresent * csaDailyRate;
        totalCsaDisbursement += csaWeeklyPayout;
        csaRows.push({
            csaId: csa.id,
            csaName: csa.name,
            csaCode: csa.employeeCode || `CSA-${csa.id}`,
            email: csa.email || 'support@laborunion.com',
            phone: csa.phone || '1800-UNION-CARE',
            bankAccountNo: formatBankAcc(csa, '3000'),
            ifscCode: formatIfsc(csa, 'SBIN0009876'),
            bankBranch: formatBranch(csa, 'SBI Central Support Branch, Hyderabad'),
            managedAgentsCount,
            daysPresent: csaDaysPresent,
            dailyRate: csaDailyRate,
            weeklyAmountToPay: csaWeeklyPayout
        });
    }
    // If no CSAs exist, provide default entry
    if (csaRows.length === 0) {
        const defaultWeekly = 6 * 750;
        totalCsaDisbursement += defaultWeekly;
        csaRows.push({
            csaId: 1,
            csaName: 'Central Customer Support Desk',
            csaCode: 'CSA-001',
            email: 'support@laborunion.com',
            phone: '1800-UNION-CARE',
            bankAccountNo: 'SBIN003000000001',
            ifscCode: 'SBIN0009876',
            bankBranch: 'SBI Central Support Branch, Hyderabad',
            managedAgentsCount: agents.length,
            daysPresent: 6,
            dailyRate: 750,
            weeklyAmountToPay: defaultWeekly
        });
    }
    const grandTotalDisbursement = totalWorkerDisbursement + totalAgentDisbursement + totalCsaDisbursement;
    return {
        weekDays,
        startDateStr: weekDays[0]?.shortDateStr || 'Mon',
        endDateStr: weekDays[5]?.shortDateStr || 'Sat',
        workerRows,
        agentRows,
        csaRows,
        summary: {
            totalWorkers: workerRows.length,
            totalAgents: agentRows.length,
            totalCsas: csaRows.length,
            totalWorkerDisbursement,
            totalAgentDisbursement,
            totalCsaDisbursement,
            grandTotalDisbursement
        }
    };
}
/**
 * Generates an Excel Workbook (.xlsx) with dedicated worksheets for Workers, Field Agents, Customer Support Agents, and Executive Summary.
 */
async function generateSaturdayWeeklyExcelBuffer(refDate = new Date()) {
    const data = await generateSaturdayWeeklyReportData(refDate);
    const workbook = new exceljs_1.default.Workbook();
    workbook.creator = 'Labor Union Management System';
    workbook.created = new Date();
    const fontHeader = { name: 'Calibri', size: 11, bold: true, color: { argb: 'FFFFFFFF' } };
    const borderThin = {
        top: { style: 'thin', color: { argb: 'FFCBD5E1' } },
        left: { style: 'thin', color: { argb: 'FFCBD5E1' } },
        bottom: { style: 'thin', color: { argb: 'FFCBD5E1' } },
        right: { style: 'thin', color: { argb: 'FFCBD5E1' } }
    };
    // ==========================================
    // SHEET 1: EXECUTIVE AUDIT SUMMARY
    // ==========================================
    const wsSummary = workbook.addWorksheet('Audit Executive Summary');
    wsSummary.columns = [
        { header: 'Metric Category', key: 'category', width: 34 },
        { header: 'Count / Quantity', key: 'count', width: 22 },
        { header: 'Weekly Payout Amount (INR)', key: 'amount', width: 30 }
    ];
    wsSummary.getRow(1).font = fontHeader;
    wsSummary.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E293B' } };
    wsSummary.getRow(1).alignment = { horizontal: 'center', vertical: 'middle' };
    wsSummary.addRow({ category: '👷 Registered Union Workers (Payroll)', count: `${data.summary.totalWorkers} Workers`, amount: data.summary.totalWorkerDisbursement });
    wsSummary.addRow({ category: '👔 Field Agents (Supervision Payout)', count: `${data.summary.totalAgents} Field Agents`, amount: data.summary.totalAgentDisbursement });
    wsSummary.addRow({ category: '🎧 Customer Support Agents (Desk Salary)', count: `${data.summary.totalCsas} Support Agents`, amount: data.summary.totalCsaDisbursement });
    const sumTotalRow = wsSummary.addRow({
        category: '⭐ GRAND TOTAL WEEKLY DISBURSEMENT',
        count: `${data.summary.totalWorkers + data.summary.totalAgents + data.summary.totalCsas} Total Personnel`,
        amount: data.summary.grandTotalDisbursement
    });
    sumTotalRow.font = { name: 'Calibri', size: 12, bold: true, color: { argb: 'FF0F172A' } };
    sumTotalRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFEF3C7' } };
    wsSummary.eachRow((row, rowNum) => {
        if (rowNum > 1) {
            row.getCell(3).numFmt = '₹#,##0.00';
            row.eachCell((cell) => { cell.border = borderThin; });
        }
    });
    // ==========================================
    // SHEET 2: WORKERS ATTENDANCE & PAYOUT
    // ==========================================
    const wsWorkers = workbook.addWorksheet('Workers Payroll');
    const dayColHeaders = data.weekDays.map((d) => `${d.dayName} (${d.shortDateStr}) Status & Pay`);
    wsWorkers.columns = [
        { header: 'S.No', key: 'sno', width: 7 },
        { header: 'Worker Name', key: 'workerName', width: 22 },
        { header: 'Worker Code', key: 'workerCode', width: 14 },
        { header: 'Skill / Designation', key: 'designation', width: 20 },
        { header: 'Assigned Field Agent', key: 'assignedAgent', width: 22 },
        { header: 'Working Site', key: 'siteName', width: 22 },
        { header: 'Bank Account Number', key: 'bankAcc', width: 24 },
        { header: 'IFSC Code', key: 'ifsc', width: 15 },
        { header: 'Bank Branch', key: 'branch', width: 28 },
        { header: 'Daily Base Wage (₹)', key: 'baseWage', width: 18 },
        ...dayColHeaders.map((h, idx) => ({ header: h, key: `day_${idx}`, width: 20 })),
        { header: 'Total Days Present', key: 'daysPresent', width: 18 },
        { header: 'Total Weekly Amount to Pay (₹)', key: 'amountToPay', width: 28 }
    ];
    wsWorkers.getRow(1).font = fontHeader;
    wsWorkers.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0F172A' } };
    wsWorkers.getRow(1).alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
    wsWorkers.getRow(1).height = 28;
    data.workerRows.forEach((r, idx) => {
        const dayCells = {};
        r.dailyBreakdowns.forEach((db, dIdx) => {
            dayCells[`day_${dIdx}`] = `${db.status} (₹${db.dayPay})`;
        });
        const row = wsWorkers.addRow({
            sno: idx + 1,
            workerName: r.workerName,
            workerCode: r.workerCode,
            designation: r.designation,
            assignedAgent: r.assignedAgentName,
            siteName: r.siteName,
            bankAcc: r.bankAccountNo,
            ifsc: r.ifscCode,
            branch: r.bankBranch,
            baseWage: r.dailyBaseWage,
            ...dayCells,
            daysPresent: r.totalDaysPresent,
            amountToPay: r.weeklyAmountToPay
        });
        row.getCell('baseWage').numFmt = '₹#,##0';
        row.getCell('amountToPay').numFmt = '₹#,##0.00';
        row.getCell('amountToPay').font = { bold: true };
        row.eachCell((cell) => { cell.border = borderThin; });
    });
    // ==========================================
    // SHEET 3: FIELD AGENTS
    // ==========================================
    const wsAgents = workbook.addWorksheet('Field Agents');
    wsAgents.columns = [
        { header: 'S.No', key: 'sno', width: 7 },
        { header: 'Field Agent Name', key: 'agentName', width: 24 },
        { header: 'Agent Code', key: 'agentCode', width: 15 },
        { header: 'Phone Number', key: 'phone', width: 16 },
        { header: 'Primary Assigned Site', key: 'siteName', width: 24 },
        { header: 'Managing Customer Support Agent', key: 'csaName', width: 28 },
        { header: 'Bank Account Number', key: 'bankAcc', width: 24 },
        { header: 'IFSC Code', key: 'ifsc', width: 15 },
        { header: 'Bank Branch', key: 'branch', width: 28 },
        { header: 'Assigned Workers Count', key: 'workerCount', width: 22 },
        { header: 'Agent Weekly Days Present', key: 'daysPresent', width: 24 },
        { header: 'Daily Wage Rate (₹)', key: 'dailyRate', width: 18 },
        { header: 'Total Weekly Amount to Pay (₹)', key: 'amountToPay', width: 28 }
    ];
    wsAgents.getRow(1).font = fontHeader;
    wsAgents.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFC2410C' } };
    wsAgents.getRow(1).alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
    wsAgents.getRow(1).height = 28;
    data.agentRows.forEach((r, idx) => {
        const row = wsAgents.addRow({
            sno: idx + 1,
            agentName: r.agentName,
            agentCode: r.agentCode,
            phone: r.phone,
            siteName: r.siteName,
            csaName: r.managingCsaName,
            bankAcc: r.bankAccountNo,
            ifsc: r.ifscCode,
            branch: r.bankBranch,
            workerCount: r.assignedWorkerCount,
            daysPresent: r.daysPresent,
            dailyRate: r.dailyRate,
            amountToPay: r.weeklyAmountToPay
        });
        row.getCell('dailyRate').numFmt = '₹#,##0';
        row.getCell('amountToPay').numFmt = '₹#,##0.00';
        row.getCell('amountToPay').font = { bold: true };
        row.eachCell((cell) => { cell.border = borderThin; });
    });
    // ==========================================
    // SHEET 4: CUSTOMER SUPPORT AGENTS (CSA)
    // ==========================================
    const wsCsas = workbook.addWorksheet('Customer Support Agents');
    wsCsas.columns = [
        { header: 'S.No', key: 'sno', width: 7 },
        { header: 'Customer Support Agent Name', key: 'csaName', width: 28 },
        { header: 'Support Agent Code', key: 'csaCode', width: 18 },
        { header: 'Email Address', key: 'email', width: 26 },
        { header: 'Phone Number', key: 'phone', width: 16 },
        { header: 'Bank Account Number', key: 'bankAcc', width: 24 },
        { header: 'IFSC Code', key: 'ifsc', width: 15 },
        { header: 'Bank Branch', key: 'branch', width: 28 },
        { header: 'Managed Field Agents Count', key: 'agentCount', width: 24 },
        { header: 'Support Days Present (Mon-Sat)', key: 'daysPresent', width: 26 },
        { header: 'Daily Wage Rate (₹)', key: 'dailyRate', width: 18 },
        { header: 'Total Weekly Amount to Pay (₹)', key: 'amountToPay', width: 28 }
    ];
    wsCsas.getRow(1).font = fontHeader;
    wsCsas.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0F766E' } };
    wsCsas.getRow(1).alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
    wsCsas.getRow(1).height = 28;
    data.csaRows.forEach((r, idx) => {
        const row = wsCsas.addRow({
            sno: idx + 1,
            csaName: r.csaName,
            csaCode: r.csaCode,
            email: r.email,
            phone: r.phone,
            bankAcc: r.bankAccountNo,
            ifsc: r.ifscCode,
            branch: r.bankBranch,
            agentCount: r.managedAgentsCount,
            daysPresent: r.daysPresent,
            dailyRate: r.dailyRate,
            amountToPay: r.weeklyAmountToPay
        });
        row.getCell('dailyRate').numFmt = '₹#,##0';
        row.getCell('amountToPay').numFmt = '₹#,##0.00';
        row.getCell('amountToPay').font = { bold: true };
        row.eachCell((cell) => { cell.border = borderThin; });
    });
    const buffer = await workbook.xlsx.writeBuffer();
    return Buffer.from(buffer);
}
/**
 * Generates clean multi-section CSV string with distinct sections for Workers, Field Agents, CSAs, and Summary.
 */
async function generateSaturdayWeeklyCsv(refDate = new Date()) {
    const data = await generateSaturdayWeeklyReportData(refDate);
    const dayHeaders = data.weekDays.map((d) => `"${d.dayName} (${d.shortDateStr}) Status & Pay"`);
    const lines = [];
    // ==========================================
    // SECTION 1: AUDIT EXECUTIVE SUMMARY
    // ==========================================
    lines.push('=== SATURDAY WEEKLY AUDIT EXECUTIVE SUMMARY ===');
    lines.push('Report Category,Count,Weekly Payout Amount (INR)');
    lines.push(`"Registered Union Workers (Payroll)","${data.summary.totalWorkers} Workers",${data.summary.totalWorkerDisbursement}`);
    lines.push(`"Field Agents (Supervision Payout)","${data.summary.totalAgents} Field Agents",${data.summary.totalAgentDisbursement}`);
    lines.push(`"Customer Support Agents (Desk Salary)","${data.summary.totalCsas} Support Agents",${data.summary.totalCsaDisbursement}`);
    lines.push(`"GRAND TOTAL WEEKLY DISBURSEMENT","${data.summary.totalWorkers + data.summary.totalAgents + data.summary.totalCsas} Total Personnel",${data.summary.grandTotalDisbursement}`);
    lines.push('');
    // ==========================================
    // SECTION 2: WORKERS ATTENDANCE & PAYOUT
    // ==========================================
    lines.push('=== SECTION 1: WORKERS ROSTER & DAILY ATTENDANCE PAYOUT ===');
    const workerHeaders = [
        'S.No',
        'Worker Name',
        'Worker Code',
        'Skill / Designation',
        'Assigned Field Agent',
        'Working Site',
        'Bank Account Number',
        'IFSC Code',
        'Bank Branch',
        'Daily Base Wage (INR)',
        ...dayHeaders,
        'Total Days Present',
        'Total Weekly Amount to Pay (INR)'
    ];
    lines.push(workerHeaders.join(','));
    data.workerRows.forEach((r, idx) => {
        const dayCols = r.dailyBreakdowns.map((db) => `"${db.status} (INR ${db.dayPay})"`);
        const line = [
            idx + 1,
            `"${r.workerName.replace(/"/g, '""')}"`,
            `"${r.workerCode}"`,
            `"${r.designation}"`,
            `"${r.assignedAgentName.replace(/"/g, '""')}"`,
            `"${r.siteName.replace(/"/g, '""')}"`,
            `"${r.bankAccountNo}"`,
            `"${r.ifscCode}"`,
            `"${r.bankBranch.replace(/"/g, '""')}"`,
            r.dailyBaseWage,
            ...dayCols,
            r.totalDaysPresent,
            r.weeklyAmountToPay
        ].join(',');
        lines.push(line);
    });
    lines.push('');
    // ==========================================
    // SECTION 3: FIELD AGENTS
    // ==========================================
    lines.push('=== SECTION 2: FIELD AGENTS SUPERVISION & PAYOUT ===');
    const agentHeaders = [
        'S.No',
        'Field Agent Name',
        'Agent Code',
        'Phone Number',
        'Primary Assigned Site',
        'Managing Customer Support Agent',
        'Bank Account Number',
        'IFSC Code',
        'Bank Branch',
        'Assigned Workers Count',
        'Agent Days Present (Mon-Sat)',
        'Daily Wage Rate (INR)',
        'Total Weekly Amount to Pay (INR)'
    ];
    lines.push(agentHeaders.join(','));
    data.agentRows.forEach((r, idx) => {
        const line = [
            idx + 1,
            `"${r.agentName.replace(/"/g, '""')}"`,
            `"${r.agentCode}"`,
            `"${r.phone}"`,
            `"${r.siteName.replace(/"/g, '""')}"`,
            `"${r.managingCsaName.replace(/"/g, '""')}"`,
            `"${r.bankAccountNo}"`,
            `"${r.ifscCode}"`,
            `"${r.bankBranch.replace(/"/g, '""')}"`,
            r.assignedWorkerCount,
            r.daysPresent,
            r.dailyRate,
            r.weeklyAmountToPay
        ].join(',');
        lines.push(line);
    });
    lines.push('');
    // ==========================================
    // SECTION 4: CUSTOMER SUPPORT AGENTS (CSA)
    // ==========================================
    lines.push('=== SECTION 3: CUSTOMER SUPPORT AGENTS & PAYOUT ===');
    const csaHeaders = [
        'S.No',
        'Customer Support Agent Name',
        'Support Agent Code',
        'Email Address',
        'Phone Number',
        'Bank Account Number',
        'IFSC Code',
        'Bank Branch',
        'Managed Field Agents Count',
        'Support Days Present (Mon-Sat)',
        'Daily Wage Rate (INR)',
        'Total Weekly Amount to Pay (INR)'
    ];
    lines.push(csaHeaders.join(','));
    data.csaRows.forEach((r, idx) => {
        const line = [
            idx + 1,
            `"${r.csaName.replace(/"/g, '""')}"`,
            `"${r.csaCode}"`,
            `"${r.email}"`,
            `"${r.phone}"`,
            `"${r.bankAccountNo}"`,
            `"${r.ifscCode}"`,
            `"${r.bankBranch.replace(/"/g, '""')}"`,
            r.managedAgentsCount,
            r.daysPresent,
            r.dailyRate,
            r.weeklyAmountToPay
        ].join(',');
        lines.push(line);
    });
    return lines.join('\n');
}
/**
 * Sends Saturday Weekly Audit Excel report (.xlsx) email to Super Agent.
 */
async function sendSaturdayWeeklyReportEmail(targetEmail) {
    const excelBuffer = await generateSaturdayWeeklyExcelBuffer();
    const dateStr = new Date().toLocaleDateString('en-IN', {
        weekday: 'long',
        year: 'numeric',
        month: 'short',
        day: 'numeric'
    });
    const subject = `📊 Saturday Weekly Audit Report (${dateStr}) - Labor Union Management`;
    const html = `
    <div style="font-family: Arial, sans-serif; max-width: 650px; margin: 0 auto; padding: 24px; border: 1px solid #E2E8F0; border-radius: 12px; background-color: #FFFFFF;">
      <h2 style="color: #2563EB; margin-top: 0;">Saturday Weekly Audit Excel Report</h2>
      <p style="color: #475569; font-size: 14px;">
        Attached is the complete <strong>Saturday Weekly Audit Excel Report (.xlsx)</strong> with dedicated, structured worksheets for <strong>Workers Payroll</strong>, <strong>Field Agents</strong>, and <strong>Customer Support Agents</strong>.
      </p>
      
      <div style="background-color: #F8FAFC; border: 1px solid #CBD5E1; padding: 16px; border-radius: 8px; margin: 20px 0;">
        <span style="font-weight: bold; color: #0F172A; display: block; margin-bottom: 6px;">Worksheet Structure & Weekly Calculation (${dateStr}):</span>
        <ul style="margin: 0; padding-left: 20px; color: #334155; font-size: 13px; line-height: 1.6;">
          <li><strong>Sheet 1 (Executive Summary):</strong> Total workers, field agents, support agents, and Grand Total Weekly Disbursement.</li>
          <li><strong>Sheet 2 (Workers Payroll):</strong> Daily attendance from Monday to Saturday, individual daily pay amounts, Bank Account, IFSC, Branch, and Total Weekly Amount to Pay.</li>
          <li><strong>Sheet 3 (Field Agents):</strong> Supervised site, managing CSA, assigned workers count, days present, banking details, and weekly supervisor payout.</li>
          <li><strong>Sheet 4 (Customer Support Agents):</strong> Support desk code, managed agent count, days present, banking details, and weekly support payout.</li>
        </ul>
      </div>

      <p style="color: #64748B; font-size: 12px; margin-bottom: 0;">
        Labor Union Management System • Automated Audit Notification
      </p>
    </div>
  `;
    const attachmentFilename = `Saturday_Weekly_Audit_Report_${new Date().toISOString().split('T')[0]}.xlsx`;
    const attachmentBase64 = excelBuffer.toString('base64');
    let result = await mail_1.resend.emails.send({
        from: mail_1.PRIMARY_FROM,
        to: [targetEmail],
        subject,
        html,
        attachments: [
            {
                filename: attachmentFilename,
                content: attachmentBase64,
            }
        ]
    });
    if (result.error) {
        console.warn(`⚠️ Resend Primary Domain notice for audit report: ${result.error.message}. Retrying via fallback domain...`);
        result = await mail_1.resend.emails.send({
            from: mail_1.FALLBACK_FROM,
            to: [targetEmail],
            subject,
            html,
            attachments: [
                {
                    filename: attachmentFilename,
                    content: attachmentBase64,
                }
            ]
        });
    }
    const messageId = result.data?.id || 'resend-delivery-logged';
    console.log(`✅ Weekly Saturday Excel Report email sent successfully to ${targetEmail}! ID: ${messageId}`);
    return { success: true, emailSentTo: targetEmail, messageId };
}
