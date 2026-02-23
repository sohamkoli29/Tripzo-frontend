import "./globals.css";

export const metadata = {
  title: "Cab Booking App",
  description: "Book rides seamlessly",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}