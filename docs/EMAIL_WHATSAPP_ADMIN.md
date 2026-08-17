# Noor-Mist Email Failover + WhatsApp

## Email
- Admin → Settings → Email
- Primary can be Brevo, SendGrid, Mailgun, Postmark, Resend, Custom API, or SMTP.
- Backups can be **API or SMTP** and are stored independently.
- Send Test Email uses the same primary→backup failover path as real emails.
- Provider-specific Test buttons test exactly one provider.
- Provider delivery failures use HTTP 502; invalid request data still uses 400.
- Brevo SMTP Host: `smtp-relay.brevo.com`; Brevo SMTP login such as `xxx@smtp-brevo.com` belongs in Username.

## WhatsApp
- Admin → Settings → WhatsApp Notifications
- Route: `/admin/whatsapp-settings`
- Meta credentials stay only in Railway backend variables: `WHATSAPP_PHONE_NUMBER_ID`, `WHATSAPP_ACCESS_TOKEN`, `WHATSAPP_API_VERSION`.
