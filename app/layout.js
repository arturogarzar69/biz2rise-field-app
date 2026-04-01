import "./globals.css";
import { uiText } from "../lib/uiText";

export const metadata = {
  title: uiText.metadata.title,
  description: uiText.metadata.description
};

export default function RootLayout({ children }) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}
