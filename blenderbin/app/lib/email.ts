import axios from 'axios';

type SendEmailArgs = {
  to: string;
  subject: string;
  html: string;
  from?: string;
  headers?: Record<string, string>;
};

const RESEND_API_KEY = process.env.RESEND_API_KEY;
const DEFAULT_FROM = process.env.EMAIL_FROM || 'BlenderBin <noreply@blenderbin.com>';

export async function sendEmail({ to, subject, html, from, headers }: SendEmailArgs): Promise<{ id: string } | null> {
  if (!RESEND_API_KEY) {
    console.warn('RESEND_API_KEY not set; skipping email send.');
    return null;
  }
  try {
    const res = await axios.post(
      'https://api.resend.com/emails',
      { from: from || DEFAULT_FROM, to, subject, html, headers },
      { headers: { Authorization: `Bearer ${RESEND_API_KEY}` } }
    );
    return res.data || { id: 'unknown' };
  } catch (err) {
    console.error('Failed to send email:', err);
    return null;
  }
}


