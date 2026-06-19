import { z } from 'zod';

export const SaleItemSchema = z.object({
  id: z.string().optional(),
  productId: z.string().min(1, 'Product ID is required'),
  quantity: z.number().positive('Quantity must be greater than zero'),
  unitPrice: z.number().nonnegative('Unit price cannot be negative').optional(),
  discountValue: z.number().nonnegative('Discount cannot be negative').optional(),
});

export const SaleSchema = z.object({
  items: z.array(SaleItemSchema).min(1, 'At least one item is required'),
  customerId: z.string().optional(),
  amountPaid: z.number().nonnegative('Amount paid cannot be negative').optional(),
  paymentMethod: z.enum(['CASH', 'CREDIT', 'INSTAPAY']),
  userId: z.string().optional(),
  staffId: z.string().optional(),
  reviewerEditOf: z.string().optional(),
  buyerInfo: z.object({
    customerName: z.string().optional(),
    customerPhone: z.string().optional(),
    customerAddress: z.string().optional()
  }).optional()
});

export const RefundItemSchema = z.object({
  productId: z.string().min(1, 'Product ID is required'),
  quantity: z.number().positive('Refund quantity must be greater than zero'),
  unitPrice: z.number().nonnegative('Unit price cannot be negative'),
  condition: z.enum(['NEW', 'DEFECTIVE']),
});

export const RefundSchema = z.object({
  invoiceId: z.string().min(1, 'Invoice ID is required'),
  items: z.array(RefundItemSchema).min(1, 'At least one item is required'),
  reason: z.string().optional(),
});

export const CustomerSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  phone: z.string().optional().nullable(),
  address: z.string().optional().nullable(),
  governorate: z.string().optional().nullable(),
  groupId: z.string().optional().nullable(),
  parentId: z.string().optional().nullable(),
});

export const CustomerPaymentSchema = z.object({
  customerId: z.string().min(1, 'Customer ID is required'),
  amount: z.number().positive('Amount must be greater than zero'),
  note: z.string().optional(),
});

export const CategorySchema = z.object({
  name: z.string().min(1, 'Category name is required'),
});

export const ProductSchema = z.object({
  name: z.string().min(1, 'Product name is required'),
  sku: z.string().min(1, 'SKU is required'),
  categoryId: z.string().min(1, 'Category is required'),
  costPrice: z.number().nonnegative('Cost price cannot be negative'),
  baseSellingPrice: z.number().nonnegative('Base selling price cannot be negative'),
  retailPrice: z.number().nonnegative().optional().default(0),
  lowestRetailPrice: z.number().nonnegative().optional().default(0),
  wholesalePrice: z.number().nonnegative().optional().default(0),
  lowestWholesalePrice: z.number().nonnegative().optional().default(0),
  unit: z.string().optional().default('piece'),
});

export const ExpenseSchema = z.object({
  description: z.string().min(1, 'Description is required'),
  amount: z.number().positive('Amount must be greater than zero'),
  userId: z.string().min(1, 'User ID is required'),
  category: z.string().optional(),
  date: z.string().optional(),
});

export const UserSchema = z.object({
  username: z.string().min(1, 'Username is required'),
  password: z.string().min(1, 'Password is required'),
  role: z.enum(['ROOT', 'ADMIN', 'ACCOUNTANT', 'SALESPERSON', 'READ_ONLY']),
  name: z.string().optional().nullable(),
  phone: z.string().optional().nullable(),
  address: z.string().optional().nullable(),
  permissions: z.array(z.string()).optional().default([]),
  baseSalary: z.number().nonnegative().optional().default(0),
  commissionRate: z.number().nonnegative().optional().default(0),
});

export const UserUpdateSchema = UserSchema.partial().omit({ password: true });

export function validateOrFail<T>(
  schema: z.ZodType<T>,
  data: unknown
): { success: true; data: T } | { success: false; error: string } {
  const parsed = schema.safeParse(data);
  if (!parsed.success) {
    const messages = parsed.error.issues.map((issue) => issue.message).join(', ');
    return { success: false, error: `Validation Error: ${messages}` };
  }
  return { success: true, data: parsed.data };
}
