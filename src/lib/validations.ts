import { z } from "zod";

export const registerSchema = z
  .object({
    firstName: z.string().min(1, "First name is required").max(50),
    lastName: z.string().min(1, "Last name is required").max(50),
    username: z
      .string()
      .min(3, "Username must be at least 3 characters")
      .max(30)
      .regex(/^[a-zA-Z0-9_]+$/, "Letters, numbers and underscores only"),
    email: z.string().email("Enter a valid email"),
    password: z
      .string()
      .min(8, "Password must be at least 8 characters")
      .regex(/[A-Za-z]/, "Include at least one letter")
      .regex(/[0-9]/, "Include at least one number"),
    confirmPassword: z.string(),
  })
  .refine((d) => d.password === d.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

export type RegisterInput = z.infer<typeof registerSchema>;

export const predictionSchema = z.object({
  matchId: z.string().min(1),
  predictedWinner: z.string().min(1),
  predictedScore: z.string().regex(/^\d+-\d+$/, "Score must look like 3-1"),
  predictedSets: z
    .array(z.object({ p1: z.number().int().min(0).max(20), p2: z.number().int().min(0).max(20) }))
    .max(5),
});

export type PredictionInputDto = z.infer<typeof predictionSchema>;
