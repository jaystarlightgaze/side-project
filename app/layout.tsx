import type { Metadata } from "next";
import { Geist, Geist_Mono, Oxanium } from "next/font/google";
import "./globals.css";
import { AccountHeader } from "@/features/account";
import { cn } from "@/lib/utils";

const geistHeading = Geist({subsets:['latin'],variable:'--font-heading'});

const oxanium = Oxanium({subsets:['latin'],variable:'--font-sans'});

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "직장 기상청",
  description: "출근 전 30초, 오늘의 직장 예보와 처신 요령",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="ko"
      className={cn("h-full", "antialiased", geistSans.variable, geistMono.variable, "font-sans", oxanium.variable, geistHeading.variable)}
    >
      <body className="min-h-full flex flex-col">
        <AccountHeader />
        {children}
      </body>
    </html>
  );
}
