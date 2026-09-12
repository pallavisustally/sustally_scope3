import React from "react";

export const metadata = {
  title: "Sustally Payload CMS",
  description: "Scope 3 inventory backend and admin.",
};

export default function FrontendLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body style={{ fontFamily: "system-ui, sans-serif", margin: 0, background: "#121212", color: "#f4f0ff" }}>
        {children}
      </body>
    </html>
  );
}
