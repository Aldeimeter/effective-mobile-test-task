import { z } from "zod";

// Password validation: min 8 chars, must include letters, numbers, and special chars
const passwordSchema = z
  .string()
  .min(8, "Password must be at least 8 characters")
  .regex(/[a-zA-Z]/, "Password must contain at least one letter")
  .regex(/[0-9]/, "Password must contain at least one number")
  .regex(
    /[^a-zA-Z0-9]/,
    "Password must contain at least one special character",
  );

// Date validation and normalization
const dateOfBirthSchema = z.string().transform((val, ctx) => {
  // Try parsing different date formats
  const formats = [
    // ISO format: YYYY-MM-DD
    /^(\d{4})-(\d{2})-(\d{2})$/,
    // US format: MM/DD/YYYY
    /^(\d{2})\/(\d{2})\/(\d{4})$/,
    // EU format: DD.MM.YYYY
    /^(\d{2})\.(\d{2})\.(\d{4})$/,
  ];

  let date: Date | null = null;

  // Try ISO format first
  if (formats[0].test(val)) {
    // Parse as UTC to avoid timezone issues
    date = new Date(`${val}T00:00:00.000Z`);
  }
  // Try US format
  else if (formats[1].test(val)) {
    const match = val.match(formats[1]);
    if (match) {
      const [, month, day, year] = match;
      date = new Date(`${year}-${month}-${day}T00:00:00.000Z`);
    }
  }
  // Try EU format
  else if (formats[2].test(val)) {
    const match = val.match(formats[2]);
    if (match) {
      const [, day, month, year] = match;
      date = new Date(`${year}-${month}-${day}T00:00:00.000Z`);
    }
  }

  if (!date || isNaN(date.getTime())) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Invalid date format",
    });
    return z.NEVER;
  }

  // Check if date is in the future
  if (date > new Date()) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Date of birth cannot be in the future",
    });
    return z.NEVER;
  }

  return date;
});

export const registerSchema = z.object({
  fullName: z.string().min(1, "Full name is required"),
  dateOfBirth: dateOfBirthSchema,
  email: z.string().email("Invalid email format"),
  password: passwordSchema,
});

export const loginSchema = z.object({
  email: z.string().email("Invalid email format"),
  password: z.string().min(1, "Password is required"),
});

export const refreshTokenSchema = z.object({
  refreshToken: z.string().min(1, "Refresh token is required"),
});

export const logoutSchema = z.object({
  refreshToken: z.string().min(1, "Refresh token is required"),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type RefreshTokenInput = z.infer<typeof refreshTokenSchema>;
export type LogoutInput = z.infer<typeof logoutSchema>;
