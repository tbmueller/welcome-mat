import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/ThemeProvider";
import { AuthProvider } from "@/components/AuthProvider";
import { ReactQueryProvider } from "@/components/ReactQueryProvider";
import { NavBar } from "@/components/NavBar";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "WelcomeMat",
  description: "Track your guests' flights",
  verification: {
    google: ["LmJYkYRdAYhuB01a-n1rLmUSWrF_sITwutRH28UirEI", "grzgpl2kmsXM_L0JWLb07T49E1XV237rDqYH0Lb7SnU"],
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={`${inter.className} bg-taupe-50 text-taupe-900 dark:bg-taupe-950 dark:text-taupe-100 min-h-screen antialiased`}>
        <ReactQueryProvider>
          <ThemeProvider>
            <AuthProvider>
              <NavBar />
              {children}
            </AuthProvider>
          </ThemeProvider>
        </ReactQueryProvider>
      </body>
    </html>
  );
}
