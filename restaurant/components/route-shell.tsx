"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const links = [
  ["/", "Overview"],
  ["/orders", "Orders"],
  ["/menu", "Menu"],
  ["/reviews", "Reviews"],
  ["/offers", "Offers"],
  ["/analytics", "Analytics"],
  ["/notifications", "Notifications"],
  ["/settings", "Settings"],
] as const;

export function RouteShell({ children }: Readonly<{ children: React.ReactNode }>) {
  const pathname = usePathname();
  return (
    <div className="shell">
      <aside className="side">
        <Link className="brand" href="/"><span aria-hidden="true">✦</span><span>Luxebites</span></Link>
        <nav aria-label="Restaurant workspace">
          {links.map(([href, label]) => <Link className={pathname === href || (href !== "/" && pathname.startsWith(href)) ? "active" : ""} href={href} key={href}>{label}</Link>)}
        </nav>
        <Link className="signout" href="/login">Sign out</Link>
      </aside>
      {children}
    </div>
  );
}
