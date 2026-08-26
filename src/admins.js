// Emails granted admin access to the /admin panel.
// Keep this in sync with the Supabase RLS policies that reference admin emails
// (e.g. the feedback read policy).
export const ADMIN_EMAILS = [
  'prior.luke.04@gmail.com',
  'priorsupply@gmail.com',
]

export const isAdminEmail = (email) => ADMIN_EMAILS.includes(email)
