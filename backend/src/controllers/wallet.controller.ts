import { Request, Response } from "express";
import * as walletService from "../services/wallet.service";

/*
 * Get Wallets (Worker gets own wallet, Super Agent/Agent gets all wallets)
 */
export const getWallets = async (
  req: Request,
  res: Response
) => {
  try {
    if (req.user?.role === "WORKER") {
      const wallet = await walletService.getWallet(req.user.id);
      return res.status(200).json({
        success: true,
        data: wallet ? [wallet] : [],
      });
    }

    const wallets = await walletService.getAllWallets();
    res.status(200).json({
      success: true,
      data: wallets,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

/*
 * Get Logged-in Worker Wallet History
 */
export const getWalletHistory = async (
  req: Request,
  res: Response
) => {
  try {
    const history = await walletService.getWalletHistory(
      req.user!.id
    );

    res.status(200).json({
      success: true,
      data: history,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

/*
 * Get Any Worker Wallet (Super Agent)
 */
export const getWorkerWallet = async (
  req: Request,
  res: Response
) => {
  try {
    const workerId = Number(req.params.workerId);

    const wallet = await walletService.getWorkerWallet(
      workerId
    );

    res.status(200).json({
      success: true,
      data: wallet,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

/*
 * Wallet Dashboard
 */
export const getWalletDashboard = async (
  req: Request,
  res: Response
) => {
  try {
    const dashboard =
      await walletService.getWalletDashboard();

    res.status(200).json({
      success: true,
      data: dashboard,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

/*
 * Credit Worker Wallet
 */
export const creditWallet = async (
  req: Request,
  res: Response
) => {
  try {
    const {
      workerId,
      amount,
      description,
    } = req.body;

    const wallet =
      await walletService.creditWallet(
        Number(workerId),
        Number(amount),
        description
      );

    res.status(200).json({
      success: true,
      message: "Wallet credited successfully",
      data: wallet,
    });
  } catch (error: any) {
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

/*
 * Debit Worker Wallet
 */
export const debitWallet = async (
  req: Request,
  res: Response
) => {
  try {
    const {
      workerId,
      amount,
      description,
    } = req.body;

    const wallet =
      await walletService.debitWallet(
        Number(workerId),
        Number(amount),
        description
      );

    res.status(200).json({
      success: true,
      message: "Wallet debited successfully",
      data: wallet,
    });
  } catch (error: any) {
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

/*
 * Disburse Weekly Attendance Allowance
 */
export const disburseWeekly = async (
  req: Request,
  res: Response
) => {
  try {
    const { poolAmount } = req.body;
    const result = await walletService.disburseWeeklyAllowance(
      poolAmount ? Number(poolAmount) : undefined
    );

    res.status(200).json({
      success: true,
      message: "Weekly attendance allowance disbursed successfully to eligible workers and agents",
      data: result,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

/*
 * Agent creates a Disbursement Request
 */
export const createDisbursementRequest = async (req: Request, res: Response) => {
  try {
    const { workerId, amount, description } = req.body;
    const agentId = req.user!.id;

    const request = await walletService.requestDisbursement(
      agentId,
      Number(workerId),
      Number(amount),
      description
    );

    res.status(201).json({
      success: true,
      message: "Disbursement request submitted for Super Agent approval",
      data: request,
    });
  } catch (error: any) {
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

/*
 * Get Disbursement Requests
 */
export const getDisbursementRequests = async (req: Request, res: Response) => {
  try {
    const requests = await walletService.getDisbursementRequests(req.user!);
    res.status(200).json({
      success: true,
      data: requests,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

/*
 * Super Agent Approves Disbursement Request
 */
export const approveDisbursement = async (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);
    const approved = await walletService.approveDisbursementRequest(id, req.user!);
    res.status(200).json({
      success: true,
      message: "Disbursement request approved successfully",
      data: approved,
    });
  } catch (error: any) {
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

/*
 * Super Agent Rejects Disbursement Request
 */
export const rejectDisbursement = async (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);
    const rejected = await walletService.rejectDisbursementRequest(id, req.user!);
    res.status(200).json({
      success: true,
      message: "Disbursement request rejected",
      data: rejected,
    });
  } catch (error: any) {
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};