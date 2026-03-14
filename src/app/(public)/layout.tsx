import { PublicShell } from "@/components/app/public-shell";

export default function PublicLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return <PublicShell>{children}</PublicShell>;
}
