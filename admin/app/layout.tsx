import "./globals.css";
import Providers from "./providers";
import { Inter } from "next/font/google";

const inter = Inter({ subsets: ["latin"] });

export const metadata = { title: "Luxebites Admin", description: "Platform administration workspace", icons: { icon: "/luxe-bites-admin-mark.svg" } };

export default function Layout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body className={inter.className}><Providers>{children}</Providers></body></html>;
}
