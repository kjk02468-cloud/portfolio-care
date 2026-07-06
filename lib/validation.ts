import { z } from 'zod'
import { LENS_TYPES } from './lens'

export const stockSchema = z.object({
  ticker: z.string().trim().min(1).max(20).toUpperCase(),
  name: z.string().trim().min(1, 'Name is required').max(120),
  industry: z.string().trim().max(120).optional().or(z.literal('')),
  sector: z.string().trim().max(120).optional().or(z.literal('')),
})

export const postSchema = z.object({
  title: z.string().trim().min(1, 'Title is required').max(200),
  body: z.string().min(1, 'Body is required'),
  lensType: z.enum(LENS_TYPES),
  status: z.enum(['draft', 'published']).default('draft'),
  themeTags: z.string().trim().max(300).optional().or(z.literal('')),
  stockIds: z.array(z.string().min(1)).default([]),
})

export type StockInput = z.infer<typeof stockSchema>
export type PostInput = z.infer<typeof postSchema>

export const registerSchema = z.object({
  name: z.string().trim().min(1, 'Name is required').max(80).optional(),
  email: z.string().trim().toLowerCase().email('Enter a valid email'),
  password: z.string().min(8, 'Password must be at least 8 characters').max(128),
})

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email(),
  password: z.string().min(1),
})

export const portfolioSchema = z.object({
  name: z.string().trim().min(1, 'Name is required').max(80),
  baseCurrency: z.string().trim().length(3).toUpperCase().default('USD'),
})

export const transactionSchema = z.object({
  symbol: z.string().trim().min(1).max(20).toUpperCase(),
  name: z.string().trim().max(120).optional().or(z.literal('')),
  assetType: z.enum(['STOCK', 'ETF', 'CRYPTO', 'FUND', 'OTHER']).default('STOCK'),
  side: z.enum(['BUY', 'SELL']),
  quantity: z.coerce.number().positive('Quantity must be greater than 0'),
  price: z.coerce.number().nonnegative('Price cannot be negative'),
  fee: z.coerce.number().nonnegative().default(0),
  tradedAt: z.coerce.date().default(() => new Date()),
})

export type RegisterInput = z.infer<typeof registerSchema>
export type PortfolioInput = z.infer<typeof portfolioSchema>
export type TransactionInput = z.infer<typeof transactionSchema>
