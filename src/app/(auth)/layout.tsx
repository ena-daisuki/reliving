import { Inter } from "next/font/google";

const inter = Inter({ subsets: ["latin"] });

export default function AuthLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div
      className={`${inter.className} bg-gradient-to-br from-purple-400 to-indigo-600 min-h-screen`}
    >
      {children}
    </div>
  );
}
