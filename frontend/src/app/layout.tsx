import type { Metadata } from "next";
import { Roboto } from "next/font/google";
import { ThemeProvider } from "@/components/ThemeProvider";
import { InventoryProvider } from "@/components/InventoryProvider";
import "./globals.css";

const roboto = Roboto({
  subsets: ["latin"],
  weight: ["300", "400", "500", "700"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Sustally · Scope 3 Accounting",
  description: "Measure and report corporate value chain (scope 3) emissions.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" data-theme="dark" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `document.documentElement.setAttribute('data-theme', localStorage.getItem('sustally-theme') || 'dark');`,
          }}
        />
      </head>
      <body className={roboto.className}>
        <ThemeProvider>
          <InventoryProvider>{children}</InventoryProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
