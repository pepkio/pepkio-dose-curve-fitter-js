import { z } from "zod";

const dosePointSchema = z.object({
  concentration_nM: z.number().positive(),
  response: z.number(),
  sd: z.number().optional(),
  excluded: z.boolean().optional(),
});

const compoundInputSchema = z.object({
  compound_id: z.string(),
  points: z.array(dosePointSchema).min(1),
});

export const doseCurveFitterInputSchema = z
  .object({
    compounds: z.array(compoundInputSchema).optional(),
    model: z.enum(["four_pl", "five_pl", "auto"]).default("auto"),
    ic50_mode: z.enum(["relative", "absolute"]).default("absolute"),
    weighting: z.enum(["none", "1/y", "1/y2"]).default("none"),
    constraints: z
      .object({
        top: z.number().optional(),
        bottom: z.number().optional(),
      })
      .optional(),
    concentration_unit: z.string().optional(),
    csv_text: z.string().optional(),
  })
  .superRefine((data, ctx) => {
    const hasCompounds = (data.compounds?.length ?? 0) > 0;
    const hasCsv = (data.csv_text?.trim().length ?? 0) > 0;
    if (!hasCompounds && !hasCsv) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Provide compounds array or csv_text",
        path: ["compounds"],
      });
    }
  });

export type DoseCurveFitterInput = z.infer<typeof doseCurveFitterInputSchema>;

export function parseRunInput(input: unknown): DoseCurveFitterInput {
  return doseCurveFitterInputSchema.parse(input);
}
