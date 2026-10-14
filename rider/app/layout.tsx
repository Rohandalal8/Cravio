import "./globals.css";
import { Inter } from "next/font/google";

const inter = Inter({ subsets: ["latin"] });

export const metadata = { title: "Luxebites Rider", description: "Delivery operations workspace", icons: { icon: "/luxe-bites-admin-mark.svg" } };

export default function Layout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body className={inter.className}>{children}</body></html>;
}
