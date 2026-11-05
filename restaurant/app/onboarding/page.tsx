const mainAppUrl = process.env.NEXT_PUBLIC_MAIN_APP_URL ?? "http://localhost:3000";

export default function OnboardingPage() {
  return (
    <main className="center">
      <div className="login-card">
        <span className="eyebrow">Restaurant partner access</span>
        <h1>Apply from the main Cravio site.</h1>
        <p>Restaurant applications are reviewed by an administrator before owner access is enabled.</p>
        <a className="button" href={`${mainAppUrl}/apply/owner`}>Open restaurant application</a>
      </div>
    </main>
  );
}
