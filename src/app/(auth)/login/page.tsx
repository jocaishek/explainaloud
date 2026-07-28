import type { Metadata } from "next";
import { AuthScreen } from "../auth-screen";

export const metadata: Metadata = {
  title: "Log in · Ropes",
  // Sign-in pages carry one-time codes in their query strings and have nothing
  // to offer a search result. `robots.ts` disallows /auth; this covers the
  // account routes that sit outside it.
  robots: { index: false, follow: false },
};

export default function LoginPage() {
  return <AuthScreen mode="login" />;
}
