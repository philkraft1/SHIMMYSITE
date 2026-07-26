/**
 * Newsletter signups:
 * 1) Saved in the ranch SQLite database (api/data/customers.db) via the API
 * 2) Emailed to NEWSLETTER_INBOX via FormSubmit.co (free)
 *
 * First FormSubmit delivery from the live site needs one “Activate Form” click.
 */
window.NEWSLETTER_CONFIG = {
  inbox: "therosenfeldranch@gmail.com",
  apiBaseUrl: "http://127.0.0.1:3001",
  subject: "New ranch newsletter signup",
};
