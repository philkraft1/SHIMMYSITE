/**
 * Newsletter signups:
 * 1) Saved in the ranch SQLite database (api/data/customers.db) via the API
 * 2) Emailed to NEWSLETTER_INBOX via FormSubmit.co (free)
 *
 * First FormSubmit delivery from the live site needs one “Activate Form” click.
 */
window.NEWSLETTER_CONFIG = {
  inbox: "therosenfeldranch@gmail.com",
  apiBaseUrl: "https://rosenfeld-ranch-api.onrender.com",
  subject: "New ranch newsletter signup",
};
