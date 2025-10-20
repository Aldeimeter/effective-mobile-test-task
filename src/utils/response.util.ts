import { Response } from "express";

export interface SuccessResponse<T = unknown> {
  success: true;
  data: T;
  message?: string;
}

export interface ErrorResponse {
  success: false;
  error: {
    message: string;
  };
}

export const sendSuccess = <T>(
  res: Response,
  statusCode: number,
  data: T,
  message?: string,
): Response => {
  const response: SuccessResponse<T> = {
    success: true,
    data,
    ...(message && { message }),
  };
  return res.status(statusCode).json(response);
};

export const sendError = (
  res: Response,
  statusCode: number,
  message: string,
): Response => {
  const response: ErrorResponse = {
    success: false,
    error: {
      message,
    },
  };
  return res.status(statusCode).json(response);
};
