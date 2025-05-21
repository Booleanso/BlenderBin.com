// import NavBar from "./components/BlenderPanel";
import NavBar from "./components/NavBar/NavBar";
// import Workspaces from "./components/Workspaces";
import Footer from "./components/Footer/Footer";


import type { Metadata } from "next";
import localFont from "next/font/local";
import "./css/globals.css";
import Link from "next/link";

const geistSans = localFont({
  src: "./fonts/GeistVF.woff",
  variable: "--font-geist-sans",
  weight: "100 900",
});
const geistMono = localFont({
  src: "./fonts/GeistMonoVF.woff",
  variable: "--font-geist-mono",
  weight: "100 900",
});

export const metadata: Metadata = {
  title: "BlenderBin",
  description: "Blender add-ons for a subscription.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head></head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <NavBar />
        {/* <Workspaces /> */}
        {children}
        <Footer />
      </body>
    </html>
  );
}