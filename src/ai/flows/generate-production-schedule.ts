'use server';

/**
 * @fileOverview Production schedule generation flow.
 *
 * - generateProductionSchedule - A function that generates a consolidated production schedule.
 * - GenerateProductionScheduleInput - The input type for the generateProductionSchedule function.
 * - GenerateProductionScheduleOutput - The return type for the generateProductionSchedule function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const GenerateProductionScheduleInputSchema = z.object({
  orders: z
    .array(
      z.object({
        orderId: z.string(),
        clientId: z.string(),
        dateLivraison: z.string(),
        items: z.array(
          z.object({
            articleId: z.string(),
            qte: z.number(),
          })
        ),
      })
    )
    .describe('Array of order details to generate the production schedule from.'),
});
export type GenerateProductionScheduleInput = z.infer<typeof GenerateProductionScheduleInputSchema>;

const GenerateProductionScheduleOutputSchema = z.object({
  schedule: z.string().describe('Consolidated production schedule.'),
});
export type GenerateProductionScheduleOutput = z.infer<typeof GenerateProductionScheduleOutputSchema>;

export async function generateProductionSchedule(
  input: GenerateProductionScheduleInput
): Promise<GenerateProductionScheduleOutput> {
  return generateProductionScheduleFlow(input);
}

const prompt = ai.definePrompt({
  name: 'generateProductionSchedulePrompt',
  input: {schema: GenerateProductionScheduleInputSchema},
  output: {schema: GenerateProductionScheduleOutputSchema},
  prompt: `You are a production planner in a pastry shop.
  Your goal is to generate a consolidated production schedule based on the provided orders.
  Consider the following orders:

  {{#each orders}}
  Order ID: {{orderId}}
  Client ID: {{clientId}}
  Delivery Date: {{dateLivraison}}
  Items:
  {{#each items}}
  - Article ID: {{articleId}}, Quantity: {{qte}}
  {{/each}}
  {{/each}}

  Generate a consolidated production schedule, attempting to merge similar tasks together where possible.
  Return the schedule in a human-readable format.
  Be concise.
  `,
});

const generateProductionScheduleFlow = ai.defineFlow(
  {
    name: 'generateProductionScheduleFlow',
    inputSchema: GenerateProductionScheduleInputSchema,
    outputSchema: GenerateProductionScheduleOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
