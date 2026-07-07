import "./globals.css";
import { Inter } from "next/font/google";
import { AuthProvider } from "./components/AuthProvider";

const inter = Inter({ subsets: ["latin"], display: "swap" });

export const metadata = {
  title: "Advanced Dashboarding",
  description:
    "Créez des dashboards automatiquement à partir d'un simple prompt.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="fr" className={inter.className}>
      <body>
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
