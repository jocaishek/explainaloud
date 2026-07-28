import { Analytics } from "@vercel/analytics/next";
import type { Metadata } from "next";
import { Geist_Mono, Instrument_Serif, Poppins } from "next/font/google";
import { ThemeProvider } from "./theme-provider";
import "./globals.css";

const poppins = Poppins({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-sans",
});

/* Mono is used only for section eyebrows and stat labels — the small tracked
   uppercase type that gives the page its editorial rhythm. */
const geistMono = Geist_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
});

/* Display serif, used only for the accented word in a headline. One italic
   serif word against the geometric sans is the whole contrast — using it for
   more than that would flatten the effect. */
const instrumentSerif = Instrument_Serif({
  subsets: ["latin"],
  weight: "400",
  style: ["normal", "italic"],
  variable: "--font-display",
});

export const metadata: Metadata = {
  title: "Ropes",
  description:
    "Explain it back out loud and know exactly when you actually understand it.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning data-scroll-behavior="smooth">
      <body
        className={`${poppins.variable} ${geistMono.variable} ${instrumentSerif.variable} font-sans`}
      >
        <ThemeProvider>{children}</ThemeProvider>
        <Analytics />
      </body>
    </html>
  );
}
