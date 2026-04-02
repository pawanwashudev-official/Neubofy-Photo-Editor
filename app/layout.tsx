import type { Metadata } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";

const jakarta = Plus_Jakarta_Sans({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Neubofy Elite Master Pro v9 - React",
  description: "Advanced Photo Editor",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/cropperjs/1.5.13/cropper.min.css" />
      </head>
      <body className={`${jakarta.className} bg-[#f8f6f4] text-[#1a1a1a] min-h-screen antialiased selection:bg-yellow-500 selection:text-black`}>
        {children}
      </body>
    </html>
  );
}
