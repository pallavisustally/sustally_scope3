import Link from "next/link";

export default function HomePage() {
  return (
    <main style={{ minHeight: "100vh", display: "grid", placeItems: "center", padding: 32 }}>
      <div>
        <p style={{ letterSpacing: "0.16em", textTransform: "uppercase", fontSize: 12, color: "#c19dff" }}>Payload CMS</p>
        <h1 style={{ fontSize: 36, margin: "8px 0 12px" }}>Sustally Scope 3 backend</h1>
        <p style={{ maxWidth: 420, color: "#d9d0f0", lineHeight: 1.5 }}>
          This service runs on port 3001. Use the admin panel to view and edit inventory collections.
        </p>
        <p style={{ marginTop: 24 }}>
          <Link href="/admin" style={{ color: "#c19dff", fontWeight: 600 }}>
            Open admin panel
          </Link>
        </p>
      </div>
    </main>
  );
}
