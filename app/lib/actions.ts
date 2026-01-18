'use server';

import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import postgres from 'postgres';

const sql = postgres(process.env.POSTGRES_URL!, { ssl: require });

const FormSchema = z.object({
  id: z.string(),
  customerId: z.string(),
  amount: z.coerce.number(),
  status: z.enum(['pending', 'paid']),
  date: z.string(),
});

const CreateInvoiceSchema = FormSchema.omit({ date: true, id: true });
const UpdateInvoiceSchema = FormSchema.omit({ date: true, id: true });

export async function createInvoice(formData: FormData) {
  // const rawFormData = {
  //   customerId: formData.get('customerId'),
  //   amount: formData.get('amount'),
  //   status: formData.get('status'),
  // };

  const rawFormData = Object.fromEntries(formData.entries());

  const { customerId, amount, status } = CreateInvoiceSchema.parse(rawFormData);
  // const { customerId, amount, status } = CreateInvoiceSchema.parse({
  //   customerId: formData.get('customerId'),
  //   amount: formData.get('amount'),
  //   status: formData.get('status'),
  // });
  const amountInCents = amount * 100;
  const date = new Date().toISOString().split('T')[0];

  await sql`
    INSERT INTO invoices (customer_id, amount, status, date)
    VALUES (${customerId}, ${amountInCents}, ${status}, ${date})
  `;

  revalidatePath('/dashboard/invoices');
  redirect('/dashboard/invoices');
}

export async function updateInvoice(formData: FormData, id: string) {
  const rawFormData = Object.fromEntries(formData.entries());
  const { customerId, amount, status } = UpdateInvoiceSchema.parse(rawFormData);
  const amountInCents = amount * 100;

  await sql`
    UPDATE invoices
    SET
      customer_id = ${customerId},
      status = ${status},
      amount = ${amountInCents}
    WHERE id = ${id};
  `;

  revalidatePath('/dashboard/invoices');
  redirect('/dashboard/invoices');
}
