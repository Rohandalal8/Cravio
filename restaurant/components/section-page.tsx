import Link from "next/link";

type SectionPageProps = {
  eyebrow: string;
  title: string;
  description: string;
  actions?: { href: string; label: string }[];
};

export function SectionPage({
  eyebrow,
  title,
  description,
  actions = [],
}: SectionPageProps) {
  return (
    <main className="main">
      <header>
        <div>
          <span className="eyebrow">{eyebrow}</span>
          <h1 className="title">{title}</h1>
        </div>
      </header>
      <section className="empty page-card">
        <h2>{title}</h2>
        <p>{description}</p>
        {actions.length > 0 && (
          <div className="page-actions">
            {actions.map((action) => (
              <Link className="button" href={action.href} key={action.href}>
                {action.label}
              </Link>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
