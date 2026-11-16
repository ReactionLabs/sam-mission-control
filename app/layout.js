import "./globals.css";

export const metadata = {
  title: "SAM: The AI Assistant for the Rest of Us",
  description: "No coding. No complicated setup. Just tell SAM what needs doing.",
};

// The posture is chosen on this device and remembered here. A fresh
// browser starts in Command (Dip's factory-default ruling); the
// groovy rooms are one tap away in the switcher.
const themeInit = `(function(){try{var t=localStorage.getItem("sam-theme");if(t){document.documentElement.dataset.theme=t;}}catch(e){}})();`;

export default function RootLayout({ children }) {
  return (
    <html lang="en" data-theme="command" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInit }} />
      </head>
      <body>{children}</body>
    </html>
  );
}
