import "./globals.css";
import Script from "next/script";
import { NotificationProvider } from "@/context/NotificationContext";

export const metadata = {
  title: "Tripzo",
  description: "Your ride, your way",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Noto+Sans:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body style={{ fontFamily: "'Noto Sans', sans-serif" }}>
        <NotificationProvider>
          {children}
        </NotificationProvider>
        <Script
          src={"https://maps.googleapis.com/maps/api/js?key=" + process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY + "&libraries=places"}
          strategy="beforeInteractive"
        />
      </body>
    </html>
  );
}