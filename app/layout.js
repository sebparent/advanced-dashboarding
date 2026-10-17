import "./globals.css";
import { Inter } from "next/font/google";

const inter = Inter({ subsets: ["latin"], display: "swap" });

export const metadata = {
  title: "Spacefill Bootcamp",
  description:
    "Ta toile blanche — décris ton idée à Claude Code et elle prend vie ici.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="fr" className={inter.className}>
      <body>{children}</body>
    </html>
  );
}
