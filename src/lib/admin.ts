export const ADMIN_EMAIL = "jovanny.shek@gmail.com";

export function isAdminEmail(email: string | null | undefined) {
  return email?.trim().toLocaleLowerCase("en-US") === ADMIN_EMAIL;
}
