import "./styles.css";
import type { ReactNode } from "react";

export const metadata = { title: "Deck Studio", description: "Daddy Choize content operations" };

export default function RootLayout({ children }: { children: ReactNode }) {
  return <html lang="th"><body>{children}</body></html>;
}
