export const EMAIL_QUEUE = "emails";
export const JOB_CONTACT_EMAIL = "contact_email";
export const JOB_SIGNUP_WELCOME_EMAIL = "signup_welcome_email";
export const JOB_PASSWORD_RESET_CODE_EMAIL = "password_reset_code_email";
export const JOB_PASSWORD_RESET_SUCCESS_EMAIL = "password_reset_success_email";
export const JOB_PARTNER_APPLICATION_EMAIL = "partner_application_email";
export const JOB_SELLER_ONBOARDING_EMAIL = "seller_onboarding_email";
// Generic pre-rendered email (subject + html) — used by the central event
// dispatcher so any domain event can queue a branded email without a bespoke job.
export const JOB_GENERIC_EMAIL = "generic_email";
