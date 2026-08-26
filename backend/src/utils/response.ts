import { Response } from "express";

export const successResponse = (
  res: Response,
  message: string,
  data?: unknown
) => {
  return res.status(200).json({
    success: true,
    message,
    data,
  });
};

export const errorResponse = (
  res: Response,
  status: number,
  message: string
) => {
  return res.status(status).json({
    success: false,
    message,
  });
};