import prisma from "../config/prisma";
import { emitSitePaymentUpdate } from "../socket/socket";
import * as razorpayService from "./razorpay.service";
import ExcelJS from "exceljs";

export interface CreateSitePaymentInput {
  amount: number;
  paymentMethod: "UPI" | "QR_CODE" | "CARD" | "RAZORPAY";
  siteId: number;
  payerId: number;
  payerRole: string;
  upiTransactionId?: string;
  transactionId?: string;
  razorpayPaymentId?: string;
  razorpayOrderId?: string;
  razorpaySignature?: string;
  remarks?: string;
}

export interface SitePaymentFilterInput {
  siteId?: number;
  agentId?: number;
  paymentMethod?: string;
  status?: string;
  startDate?: string;
  endDate?: string;
  search?: string;
}

/**
 * Record a new Site Bill / Fee Payment
 */
export const createSitePayment = async (data: CreateSitePaymentInput) => {
  if (!data.amount || data.amount <= 0) {
    throw new Error("Invalid payment amount. Amount must be greater than 0.");
  }

  if (!data.siteId) {
    throw new Error("Project Site is required.");
  }

  // 1. Fetch Site & Assigned Agents
  const site = await prisma.site.findUnique({
    where: { id: Number(data.siteId) },
    include: {
      users: {
        where: { role: "AGENT" },
        select: { id: true, name: true, employeeCode: true }
      },
      createdBy: {
        select: { id: true, name: true, employeeCode: true, role: true }
      },
      siteAssignments: {
        where: { status: "ACTIVE" },
        include: {
          agent: { select: { id: true, name: true, employeeCode: true } }
        }
      }
    }
  });

  if (!site) {
    throw new Error(`Site with ID ${data.siteId} not found.`);
  }

  // 2. Fetch Payer Details
  const payer = await prisma.user.findUnique({
    where: { id: Number(data.payerId) },
    select: { id: true, name: true, role: true, email: true, phone: true, siteId: true }
  });

  if (!payer) {
    throw new Error("Payer user record not found.");
  }

  // 3. Restriction Check for AGENT role: Agent can only pay for assigned sites
  if (data.payerRole === "AGENT" || payer.role === "AGENT") {
    const isDirectUser = payer.siteId === site.id || site.users.some((u) => u.id === payer.id);
    const isAssigned = site.siteAssignments.some((sa) => sa.agent.id === payer.id);
    const isCreator = site.createdBy?.id === payer.id;

    if (!isDirectUser && !isAssigned && !isCreator) {
      throw new Error(
        `Access Denied: You are not assigned to site "${site.siteName}". Field agents can only submit payments for their assigned sites.`
      );
    }
  }

  // 4. Determine Assigned Agent details for this site
  let assignedAgentId: number | null = null;
  let assignedAgentName: string | null = null;

  if (payer.role === "AGENT") {
    assignedAgentId = payer.id;
    assignedAgentName = payer.name;
  } else if (site.siteAssignments.length > 0 && site.siteAssignments[0].agent) {
    assignedAgentId = site.siteAssignments[0].agent.id;
    assignedAgentName = site.siteAssignments[0].agent.name;
  } else if (site.users.length > 0) {
    assignedAgentId = site.users[0].id;
    assignedAgentName = site.users[0].name;
  } else if (site.createdBy && site.createdBy.role === "AGENT") {
    assignedAgentId = site.createdBy.id;
    assignedAgentName = site.createdBy.name;
  }

  // 5. Razorpay Signature Verification if CARD / RAZORPAY
  if (data.paymentMethod === "CARD" || data.paymentMethod === "RAZORPAY") {
    if (data.razorpayOrderId && data.razorpayPaymentId && data.razorpaySignature) {
      const isSignatureValid = razorpayService.verifyRazorpaySignature({
        order_id: data.razorpayOrderId,
        payment_id: data.razorpayPaymentId,
        signature: data.razorpaySignature
      });

      if (!isSignatureValid) {
        throw new Error("Payment signature verification failed. Invalid transaction signature.");
      }
    }
  }

  // 6. Generate final transaction reference
  const txnId =
    data.transactionId ||
    data.upiTransactionId ||
    data.razorpayPaymentId ||
    `TXN-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;

  const fullAddress = [site.address, site.city, site.state, site.pincode].filter(Boolean).join(", ");

  // 7. Persist SitePayment Record
  const newPayment = await prisma.sitePayment.create({
    data: {
      amount: Number(data.amount),
      paymentMethod: data.paymentMethod,
      siteId: site.id,
      siteName: site.siteName,
      siteAddress: fullAddress || site.address || "N/A",
      payerId: payer.id,
      payerName: payer.name,
      payerRole: String(payer.role),
      assignedAgentId: assignedAgentId,
      assignedAgentName: assignedAgentName,
      transactionId: txnId,
      upiTransactionId: data.upiTransactionId || (data.paymentMethod === "UPI" || data.paymentMethod === "QR_CODE" ? txnId : undefined),
      razorpayPaymentId: data.razorpayPaymentId || (data.paymentMethod === "CARD" || data.paymentMethod === "RAZORPAY" ? txnId : undefined),
      razorpayOrderId: data.razorpayOrderId || undefined,
      status: "SUCCESS",
      remarks: data.remarks?.trim() || undefined
    },
    include: {
      site: { select: { id: true, siteName: true, siteCode: true, address: true, city: true, state: true } },
      payer: { select: { id: true, name: true, role: true, email: true, phone: true } }
    }
  });

  // 8. Emit live socket event
  emitSitePaymentUpdate(newPayment);

  return newPayment;
};

/**
 * Fetch Site Payments with Role-based filtering
 */
export const getSitePayments = async (user: any, filters: SitePaymentFilterInput = {}) => {
  const whereClause: any = {};

  // Role Scoping
  if (user.role === "AGENT") {
    whereClause.OR = [
      { payerId: Number(user.id) },
      { assignedAgentId: Number(user.id) },
      { site: { users: { some: { id: Number(user.id) } } } },
      { site: { siteAssignments: { some: { agentId: Number(user.id) } } } }
    ];
  } else if (user.role === "CUSTOMER_SUPPORT") {
    // Customer Support Agents can view all site payments or filter by their own
    if (filters.search === "my_payments") {
      whereClause.payerId = Number(user.id);
    }
  }

  // Filter by Site
  if (filters.siteId) {
    whereClause.siteId = Number(filters.siteId);
  }

  // Filter by Agent ID
  if (filters.agentId) {
    whereClause.assignedAgentId = Number(filters.agentId);
  }

  // Filter by Payment Method
  if (filters.paymentMethod && filters.paymentMethod !== "ALL") {
    whereClause.paymentMethod = filters.paymentMethod;
  }

  // Filter by Status
  if (filters.status && filters.status !== "ALL") {
    whereClause.status = filters.status;
  }

  // Filter by Date Range
  if (filters.startDate && filters.endDate) {
    const start = new Date(filters.startDate);
    start.setHours(0, 0, 0, 0);
    const end = new Date(filters.endDate);
    end.setHours(23, 59, 59, 999);
    whereClause.createdAt = {
      gte: start,
      lte: end
    };
  } else if (filters.startDate) {
    const start = new Date(filters.startDate);
    start.setHours(0, 0, 0, 0);
    whereClause.createdAt = { gte: start };
  }

  // General Text Search
  if (filters.search && filters.search !== "my_payments") {
    const term = filters.search.trim();
    whereClause.AND = [
      ...(whereClause.AND || []),
      {
        OR: [
          { siteName: { contains: term, mode: "insensitive" } },
          { payerName: { contains: term, mode: "insensitive" } },
          { assignedAgentName: { contains: term, mode: "insensitive" } },
          { transactionId: { contains: term, mode: "insensitive" } },
          { upiTransactionId: { contains: term, mode: "insensitive" } },
          { razorpayPaymentId: { contains: term, mode: "insensitive" } }
        ]
      }
    ];
  }

  const payments = await prisma.sitePayment.findMany({
    where: whereClause,
    orderBy: { createdAt: "desc" },
    include: {
      site: { select: { id: true, siteName: true, siteCode: true, address: true, city: true, state: true } },
      payer: { select: { id: true, name: true, role: true, email: true, phone: true } }
    }
  });

  return payments;
};

/**
 * Generate Formatted Excel Audit Report for Site Payments
 */
export const exportSitePaymentsExcel = async (user: any, filters: SitePaymentFilterInput = {}): Promise<Buffer> => {
  const payments = await getSitePayments(user, filters);

  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Labor Union Management System";
  workbook.created = new Date();

  const worksheet = workbook.addWorksheet("Site Payments Audit Report", {
    views: [{ showGridLines: true }]
  });

  // Title Row
  worksheet.mergeCells("A1:L1");
  const titleCell = worksheet.getCell("A1");
  titleCell.value = "LABOR UNION MANAGEMENT - SITE PAYMENTS AUDIT REPORT";
  titleCell.font = { name: "Arial", size: 16, bold: true, color: { argb: "FFFFFFFF" } };
  titleCell.fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FF1E3A8A" } // Deep Blue
  };
  titleCell.alignment = { horizontal: "center", vertical: "middle" };
  worksheet.getRow(1).height = 36;

  // Subtitle / Metadata Row
  worksheet.mergeCells("A2:L2");
  const subCell = worksheet.getCell("A2");
  const reportDateStr = new Date().toLocaleString("en-IN", {
    dateStyle: "full",
    timeStyle: "short"
  });
  subCell.value = `Generated On: ${reportDateStr} | Total Records: ${payments.length} | Generated By: ${user.name} (${user.role})`;
  subCell.font = { name: "Arial", size: 10.5, italic: true, color: { argb: "FF475569" } };
  subCell.alignment = { horizontal: "center", vertical: "middle" };
  subCell.fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FFF1F5F9" }
  };
  worksheet.getRow(2).height = 24;

  worksheet.addRow([]); // Blank line

  // Column Definitions
  worksheet.columns = [
    { header: "S.No", key: "sno", width: 8 },
    { header: "Date & Time", key: "dateTime", width: 22 },
    { header: "Site Name", key: "siteName", width: 26 },
    { header: "Site Address", key: "siteAddress", width: 34 },
    { header: "Assigned Agent Name", key: "agentName", width: 24 },
    { header: "Agent ID", key: "agentId", width: 14 },
    { header: "Paid By Name", key: "payerName", width: 22 },
    { header: "Paid By Role", key: "payerRole", width: 18 },
    { header: "Payment Method", key: "method", width: 18 },
    { header: "UPI / Transaction ID", key: "transactionId", width: 28 },
    { header: "Amount (₹)", key: "amount", width: 18 },
    { header: "Status", key: "status", width: 14 }
  ];

  // Format Header Row (Row 4)
  const headerRow = worksheet.getRow(4);
  headerRow.height = 28;
  headerRow.eachCell((cell) => {
    cell.font = { name: "Arial", size: 11, bold: true, color: { argb: "FFFFFFFF" } };
    cell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FF2563EB" } // Royal Blue
    };
    cell.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
    cell.border = {
      top: { style: "thin", color: { argb: "FFCBD5E1" } },
      left: { style: "thin", color: { argb: "FFCBD5E1" } },
      bottom: { style: "medium", color: { argb: "FF1E3A8A" } },
      right: { style: "thin", color: { argb: "FFCBD5E1" } }
    };
  });

  // Populate Data Rows
  let totalAmount = 0;

  payments.forEach((payment, idx) => {
    totalAmount += payment.amount;

    const formattedDate = new Date(payment.createdAt).toLocaleString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    });

    const row = worksheet.addRow({
      sno: idx + 1,
      dateTime: formattedDate,
      siteName: payment.siteName,
      siteAddress: payment.siteAddress || "N/A",
      agentName: payment.assignedAgentName || "Unassigned",
      agentId: payment.assignedAgentId ? `AGT-${String(payment.assignedAgentId).padStart(3, "0")}` : "N/A",
      payerName: payment.payerName,
      payerRole: payment.payerRole,
      method: payment.paymentMethod,
      transactionId: payment.transactionId || payment.upiTransactionId || payment.razorpayPaymentId || "N/A",
      amount: payment.amount,
      status: payment.status
    });

    row.height = 24;

    const isEven = idx % 2 === 0;
    const rowBg = isEven ? "FFFFFFFF" : "FFF8FAFC";

    row.eachCell((cell, colNumber) => {
      cell.font = { name: "Arial", size: 10.5 };
      cell.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: rowBg }
      };
      cell.border = {
        top: { style: "thin", color: { argb: "FFE2E8F0" } },
        left: { style: "thin", color: { argb: "FFE2E8F0" } },
        bottom: { style: "thin", color: { argb: "FFE2E8F0" } },
        right: { style: "thin", color: { argb: "FFE2E8F0" } }
      };

      if (colNumber === 1 || colNumber === 6 || colNumber === 8 || colNumber === 9 || colNumber === 12) {
        cell.alignment = { horizontal: "center", vertical: "middle" };
      } else if (colNumber === 11) {
        cell.alignment = { horizontal: "right", vertical: "middle" };
        cell.numFmt = "₹ #,##0.00";
        cell.font = { name: "Arial", size: 10.5, bold: true };
      } else {
        cell.alignment = { horizontal: "left", vertical: "middle" };
      }

      // Status Pill style
      if (colNumber === 12) {
        cell.font = { name: "Arial", size: 10, bold: true, color: { argb: "FF15803D" } };
      }
    });
  });

  // Summary Total Row
  const totalRow = worksheet.addRow({
    sno: "",
    dateTime: "",
    siteName: "TOTAL SUMMARY",
    siteAddress: "",
    agentName: "",
    agentId: "",
    payerName: "",
    payerRole: "",
    method: "",
    transactionId: `${payments.length} Transactions`,
    amount: totalAmount,
    status: "COMPLETED"
  });

  totalRow.height = 30;

  totalRow.eachCell((cell, colNumber) => {
    cell.font = { name: "Arial", size: 11, bold: true, color: { argb: "FF0F172A" } };
    cell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FFDCFCE7" } // Soft Mint Green
    };
    cell.border = {
      top: { style: "medium", color: { argb: "FF15803D" } },
      left: { style: "thin", color: { argb: "FFCBD5E1" } },
      bottom: { style: "double", color: { argb: "FF15803D" } },
      right: { style: "thin", color: { argb: "FFCBD5E1" } }
    };

    if (colNumber === 3) {
      cell.alignment = { horizontal: "left", vertical: "middle" };
    } else if (colNumber === 11) {
      cell.alignment = { horizontal: "right", vertical: "middle" };
      cell.numFmt = "₹ #,##0.00";
    } else {
      cell.alignment = { horizontal: "center", vertical: "middle" };
    }
  });

  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
};
