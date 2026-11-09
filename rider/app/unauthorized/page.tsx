import Link from "next/link";
export default function UnauthorizedPage() {
  return (
    <main className="center-page">
      <div className="empty">
        <div className="empty-icon">!</div>
        <h1>Rider access only</h1>
        <p>This account is not approved for the delivery partner workspace.</p>
        <Link className="button" href="/login">
          Return to sign in
        </Link>
      </div>
    </main>
  );
}
