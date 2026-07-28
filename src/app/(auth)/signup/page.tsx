import type { Metadata } from "next";
import { AuthScreen } from "../auth-screen";

export const metadata: Metadata = {
  title: "Sign up · Explainaloud",
  robots: { index: false, follow: false },
};

export default function SignUpPage() {
  return <AuthScreen mode="signup" />;
}
