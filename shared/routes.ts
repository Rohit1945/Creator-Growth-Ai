import { z } from 'zod';
import { analysisRequestSchema, analysisResponseSchema } from './schema';

export const errorSchemas = {
  validation: z.object({
    message: z.string(),
    field: z.string().optional(),
  }),
  notFound: z.object({
    message: z.string(),
  }),
  internal: z.object({
    message: z.string(),
  }),
};

export const api = {
  analyze: {
    method: 'POST' as const,
    path: '/api/analyze',
    input: analysisRequestSchema,
    responses: {
      200: analysisResponseSchema,
      400: errorSchemas.validation,
      500: errorSchemas.internal,
    },
  },
  fetchYoutubeVideo: {
    method: 'POST' as const,
    path: '/api/fetchYoutubeVideo',
    input: z.object({ url: z.string() }),
    responses: {
      200: z.object({
        title: z.string(),
        description: z.string(),
        tags: z.array(z.string()),
        channelTitle: z.string(),
      }),
      400: errorSchemas.validation,
      500: errorSchemas.internal,
    },
  },
  uploadVideo: {
    method: 'POST' as const,
    path: '/api/uploadVideo',
    // input: FormData (handled via multer/middleware)
    responses: {
      200: z.object({ 
        transcript: z.string(),
        analysis: analysisResponseSchema
      }),
      400: errorSchemas.validation,
      500: errorSchemas.internal,
    },
  },
  chat: {
    method: 'POST' as const,
    path: '/api/chat',
    input: z.object({
      message: z.string(),
      history: z.array(z.object({ role: z.enum(['user', 'assistant']), content: z.string() })),
      context: z.any()
    }),
    responses: {
      200: z.object({ message: z.string(), updatedAnalysis: analysisResponseSchema.optional() }),
      500: errorSchemas.internal,
    },
  },
};

export type AnalysisRequest = z.infer<typeof api.analyze.input>;
export type AnalysisResponse = z.infer<typeof api.analyze.responses[200]>;
export type ValidationError = z.infer<typeof errorSchemas.validation>;
export type NotFoundError = z.infer<typeof errorSchemas.notFound>;
export type InternalError = z.infer<typeof errorSchemas.internal>;

export function buildUrl(path: string, params?: Record<string, string | number>): string {
  let url = path;
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (url.includes(`:${key}`)) {
        url = url.replace(`:${key}`, String(value));
      }
    });
  }
  return url;
}
