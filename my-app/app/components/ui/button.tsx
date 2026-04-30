type ButtonProps = {
  children: React.ReactNode;
  onClick?: () => void;
  type?: "button" | "submit" | "reset";
  disabled?: boolean;
  loading?: boolean;
  variant?: "primary" | "secondary" | "outline";
  fullWidth?: boolean;
  className?: string;
};

export default function Button({
  children,
  onClick,
  type = "button",
  disabled = false,
  loading = false,
  variant = "primary",
  fullWidth = false,
  className = "",
}: ButtonProps) {
  const base =
    "inline-flex items-center justify-center rounded-xl px-4 py-2.5 text-sm font-bold transition disabled:cursor-not-allowed disabled:opacity-60";
  const variants: Record<NonNullable<ButtonProps["variant"]>, string> = {
    primary: "bg-primary text-white hover:brightness-110",
    secondary: "bg-secondary text-slate-950 hover:brightness-105",
    outline: "border border-slate-600 text-slate-100 hover:bg-slate-800",
  };
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled || loading}
      className={`${base} ${variants[variant]} ${fullWidth ? "w-full" : ""} ${className}`.trim()}
    >
      {loading ? "Carregando..." : children}
    </button>
  );
}