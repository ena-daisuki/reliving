interface PageTitleProps {
  children: React.ReactNode;
}

export function PageTitle({ children }: PageTitleProps) {
  return <h1 className="text-3xl font-bold mb-6 text-white">{children}</h1>;
}
