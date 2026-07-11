import { useState } from "react";

type Props = {
  id: string;
  value: string;
  onChange: (v: string) => void;
  autoComplete?: string;
  minLength?: number;
  required?: boolean;
};

export function PasswordInput({
  id,
  value,
  onChange,
  autoComplete = "current-password",
  minLength,
  required = true,
}: Props) {
  const [show, setShow] = useState(false);
  return (
    <div className="relative">
      <input
        id={id}
        type={show ? "text" : "password"}
        required={required}
        minLength={minLength}
        autoComplete={autoComplete}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full h-11 pl-3 pr-16 bg-[color:var(--ice)] border border-[color:var(--divider)] rounded-md font-mono text-sm outline-none focus:border-[color:var(--bronze)] transition-colors"
        style={{ color: "var(--graphite)" }}
      />
      <button
        type="button"
        onClick={() => setShow((s) => !s)}
        aria-label={show ? "Ocultar senha" : "Mostrar senha"}
        className="absolute right-2 top-1/2 -translate-y-1/2 h-7 px-2 font-mono uppercase tracking-widest text-[9px] rounded transition-colors hover:opacity-70"
        style={{ color: "var(--bronze)" }}
      >
        {show ? "Ocultar" : "Mostrar"}
      </button>
    </div>
  );
}
