import { Router, Request, Response } from 'express';
import { authenticate } from '../middleware/auth.middleware';
import { authorize } from '../middleware/role.middleware';
import { UserRole } from '@prisma/client';
import {
  checkSaturdayWindowStatus,
  generateSaturdayWeeklyCsv,
  generateSaturdayWeeklyReportData,
  sendSaturdayWeeklyReportEmail
} from '../services/report.service';

const router = Router();

// GET /api/reports/saturday-weekly-status
router.get('/saturday-weekly-status', authenticate, authorize(UserRole.SUPER_AGENT), (req: Request, res: Response) => {
  try {
    const demo = req.query.demo === 'true';
    const status = checkSaturdayWindowStatus();
    if (demo) {
      status.active = true;
      status.message = 'Saturday Weekly Audit Report is AVAILABLE (Demo Mode Forced)';
    }
    return res.json(status);
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

// GET /api/reports/saturday-weekly-data
router.get('/saturday-weekly-data', authenticate, authorize(UserRole.SUPER_AGENT), async (req: Request, res: Response) => {
  try {
    const { rows, weekDays } = await generateSaturdayWeeklyReportData();
    return res.json({ success: true, count: rows.length, data: rows, weekDays });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

// GET /api/reports/saturday-weekly-excel (Download CSV/Excel)
router.get('/saturday-weekly-excel', authenticate, authorize(UserRole.SUPER_AGENT), async (req: Request, res: Response) => {
  try {
    const demo = req.query.demo === 'true';
    const status = checkSaturdayWindowStatus();

    if (!status.active && !demo) {
      return res.status(403).json({
        error: 'Saturday Weekly Audit Excel Report is only available from Saturday 6:00 PM to Monday 9:00 AM.'
      });
    }

    const csvContent = await generateSaturdayWeeklyCsv();
    const dateStr = new Date().toISOString().split('T')[0];
    const fileName = `Saturday_Weekly_Audit_Report_${dateStr}.csv`;

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
    return res.send(csvContent);
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

// POST /api/reports/send-saturday-email
router.post('/send-saturday-email', authenticate, authorize(UserRole.SUPER_AGENT), async (req: Request, res: Response) => {
  try {
    const reqUser = (req as any).user;
    const targetEmail = req.body.email || reqUser?.email || 'superagent@laborunion.com';

    const result = await sendSaturdayWeeklyReportEmail(targetEmail);
    return res.json({
      success: true,
      message: `Weekly Saturday Excel Report email sent successfully to ${targetEmail}!`,
      details: result
    });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

export default router;
