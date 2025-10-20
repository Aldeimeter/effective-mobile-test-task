import { Request, Response, NextFunction } from "express";
import { ZodSchema } from "zod";
import { ValidationError } from "../utils/errors.js";

export const validate = (schema: ZodSchema) => {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = schema.safeParse(req.body);

      if (!result.success) {
        const errorMessages = result.error.issues
          .map((issue) => `${issue.path.join(".")}: ${issue.message}`)
          .join(", ");
        throw new ValidationError(errorMessages);
      }

      // Replace req.body with validated and transformed data
      req.body = result.data;
      next();
    } catch (error) {
      next(error);
    }
  };
};

export const validateParams = (schema: ZodSchema) => {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = schema.safeParse(req.params);

      if (!result.success) {
        const errorMessages = result.error.issues
          .map((issue) => `${issue.path.join(".")}: ${issue.message}`)
          .join(", ");
        throw new ValidationError(errorMessages);
      }

      // Replace req.params with validated and transformed data
      req.params = result.data as typeof req.params;
      next();
    } catch (error) {
      next(error);
    }
  };
};
