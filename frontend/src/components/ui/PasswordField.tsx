import {
  forwardRef,
  useId,
  useState,
  type InputHTMLAttributes,
} from "react";

interface PasswordFieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
}

export const PasswordField = forwardRef<HTMLInputElement, PasswordFieldProps>(
  function PasswordField({ label, error, id, className = "", ...rest }, ref) {
    const autoId = useId();
    const inputId = id ?? rest.name ?? autoId;
    const errorId = error ? `${inputId}-error` : undefined;
    const [visible, setVisible] = useState(false);

    return (
      <div className="flex flex-col gap-1.5">
        <div className="flex items-center justify-between gap-2">
          <label
            htmlFor={inputId}
            className="text-sm font-medium text-slate-700"
          >
            {label}
          </label>
          <button
            type="button"
            className="text-xs font-semibold text-brand-800 hover:text-brand-900"
            onClick={() => setVisible((v) => !v)}
            aria-label={visible ? "Hide password" : "Show password"}
            aria-pressed={visible}
            aria-controls={inputId}
          >
            {visible ? "Hide" : "Show"}
          </button>
        </div>
        <input
          ref={ref}
          id={inputId}
          type={visible ? "text" : "password"}
          autoComplete="current-password"
          className={`w-full rounded-lg border bg-white px-3 py-2.5 text-sm text-slate-900 shadow-sm transition placeholder:text-slate-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 ${
            error
              ? "border-red-300 focus-visible:ring-red-500"
              : "border-slate-200"
          } ${className}`}
          aria-invalid={error ? true : undefined}
          aria-describedby={errorId}
          {...rest}
        />
        {error ? (
          <p id={errorId} role="alert" className="text-sm text-red-600">
            {error}
          </p>
        ) : null}
      </div>
    );
  },
);
