import type { Config } from './config';

export type AccountEmail = {
  to: string; subject: string; text: string;
  action?: { label: string; url: string };
};

const escape = (value: string) => value.replace(/[&<>"']/g, c =>
  ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);

export function renderEmail(config: Pick<Config, 'baseURL'>, message: AccountEmail) {
  const origin = new URL(config.baseURL).origin;
  if (message.action) {
    const url = new URL(message.action.url);
    if (url.origin !== origin || url.username || url.password || !['https:', 'http:'].includes(url.protocol)) {
      throw new Error('Email action must use the application origin.');
    }
  }
  const home = escape(origin), actionURL = message.action && escape(message.action.url);
  const paragraphs = message.text.split(/\n\s*\n/).map(p =>
    `<p style="margin:0 0 20px;font-size:16px;line-height:26px;color:#f0f3eb;overflow-wrap:anywhere;word-break:break-word;">${escape(p).replace(/\n/g, '<br>')}</p>`).join('');
  const action = message.action ? `
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="table-layout:fixed;margin:8px 0 24px;"><tr><td align="center" bgcolor="#c3ef69" style="border-radius:7px;">
<a href="${actionURL}" style="display:block;padding:15px 16px;border:1px solid #c3ef69;border-radius:7px;color:#101510;background-color:#c3ef69;font-size:16px;line-height:24px;font-weight:700;text-decoration:none;overflow-wrap:anywhere;">${escape(message.action.label)}</a>
</td></tr></table>
<p style="margin:0 0 8px;font-size:13px;line-height:21px;color:#a5aca2;">If the button doesn’t work, copy this link into your browser:</p>
<p style="margin:0;font-size:13px;line-height:21px;word-break:break-all;overflow-wrap:anywhere;"><a href="${actionURL}" style="color:#c3ef69;text-decoration:underline;word-break:break-all;overflow-wrap:anywhere;">${actionURL}</a></p>` : '';
  const text = `${message.subject}\n\n${message.text}${message.action ? `\n\n${message.action.label}:\n${message.action.url}` : ''}

—
Jamloom · Your sound. Your music.
Need help? support@jamloom.com
General enquiries: contact@jamloom.com
${origin}
`;
  // Inline styles and presentation tables are intentional for email clients; no web CSS/runtime required.
  const html = `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="dark"><meta name="supported-color-schemes" content="dark"><title>${escape(message.subject)}</title>
<style>body{margin:0!important;padding:0!important;}table{border-collapse:collapse;mso-table-lspace:0pt;mso-table-rspace:0pt;}a:focus-visible{outline:3px solid #c3ef69;outline-offset:4px;}@media only screen and (max-width:480px){.outer{padding:16px 8px!important;}.content{padding:24px 20px!important;}.email-title{font-size:28px!important;line-height:34px!important;}}</style></head>
<body bgcolor="#101211" style="margin:0;padding:0;width:100%;background-color:#101211;color:#f0f3eb;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;-webkit-text-size-adjust:100%;">
<div style="display:none;max-height:0;max-width:0;overflow:hidden;opacity:0;mso-hide:all;" aria-hidden="true">${escape(message.text.slice(0, 120))}</div>
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" bgcolor="#101211" style="width:100%;table-layout:fixed;"><tr><td class="outer" align="center" style="padding:40px 16px;">
<!--[if mso]><table role="presentation" width="600" cellspacing="0" cellpadding="0" border="0"><tr><td><![endif]-->
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="width:100%;max-width:600px;table-layout:fixed;">
<tr><td style="padding:0 8px 26px;">
<a href="${home}" aria-label="Jamloom home" style="display:inline-block;color:#f0f3eb;font-size:32px;line-height:44px;font-weight:800;letter-spacing:-1.5px;text-decoration:none;"><img src="${home}/studio/icon-192.png" width="40" height="40" alt="" style="vertical-align:middle;margin-right:10px;border:0;">jamloom</a>
<p style="margin:6px 0 0;color:#a5aca2;font-size:14px;line-height:22px;letter-spacing:0;">Your sound. Your music.</p>
</td></tr>
<tr><td class="content" bgcolor="#191c19" style="padding:32px;border:1px solid #303830;border-top:3px solid #c3ef69;border-radius:9px;overflow-wrap:anywhere;word-break:break-word;">
<h1 class="email-title" style="margin:0 0 24px;color:#f0f3eb;font-size:34px;line-height:40px;letter-spacing:-1px;font-weight:750;overflow-wrap:anywhere;">${escape(message.subject)}</h1>
${paragraphs}${action}
</td></tr>
<tr><td style="padding:24px 8px 0;color:#a5aca2;font-size:13px;line-height:22px;overflow-wrap:anywhere;word-break:break-word;">
<p style="margin:0 0 12px;">Need a hand? <a href="mailto:support@jamloom.com" style="color:#c3ef69;text-decoration:underline;">Contact support</a> or reply to this email.</p>
<p style="margin:0 0 12px;"><a href="${home}" style="color:#a5aca2;text-decoration:underline;">Jamloom</a> &nbsp;·&nbsp; <a href="mailto:contact@jamloom.com" style="color:#a5aca2;text-decoration:underline;">General enquiries</a></p>
<p style="margin:0;color:#a5aca2;">Jamloom · Your sound. Your music.</p>
</td></tr></table>
<!--[if mso]></td></tr></table><![endif]-->
</td></tr></table></body></html>`;
  return { html, text };
}
