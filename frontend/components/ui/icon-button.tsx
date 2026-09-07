import type { ButtonHTMLAttributes, ReactNode } from "react";

type IconButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  active?: boolean;
  children: ReactNode;
  label: string;
};

export function IconButton({ active = false, children, label, ...props }: IconButtonProps) {
  return (
    <button
      aria-label={label}
      className={`icon-button${active ? " icon-button--active" : ""}`}
      type="button"
      {...props}
    >
      {children}
    </button>
  );
}
