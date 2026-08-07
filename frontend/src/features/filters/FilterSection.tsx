import type { ReactNode } from "react";

export function FilterSection({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-2">
      <span className="text-label-md text-text-secondary uppercase">
        {label}
      </span>
      {children}
    </div>
  );
}
