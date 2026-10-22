import {
  useEffect,
  useId,
  useRef,
  type ReactNode,
  type ButtonHTMLAttributes,
} from "react";
import { Link } from "react-router-dom";
import { ArrowUpRight, X, Sparkles, BookOpen } from "lucide-react";
export function Button({
  children,
  variant = "primary",
  className = "",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "outline" | "ghost" | "ink" | "amber";
}) {
  return (
    <button className={`button button-${variant} ${className}`} {...props}>
      {children}
    </button>
  );
}
export function ButtonLink({
  children,
  to,
  variant = "primary",
  className = "",
}: {
  children: ReactNode;
  to: string;
  variant?: string;
  className?: string;
}) {
  return (
    <Link className={`button button-${variant} ${className}`} to={to}>
      {children}
    </Link>
  );
}
export function Brand() {
  return (
    <span className="wordmark">
      <svg
        className="brand-icon"
        width="35"
        height="38"
        viewBox="0 0 40 40"
        fill="none"
        aria-hidden="true"
      >
        <rect x="1" y="1" width="38" height="38" rx="10" fill="currentColor" />
        <path
          d="M9 14c4-1 8 1 11 4 3-3 7-5 11-4v13c-4-1-8 0-11 3-3-3-7-4-11-3V14Z"
          stroke="white"
          strokeWidth="1.7"
        />
        <path
          d="M20 18v12M20 8v3M12 9l2 3M28 9l-2 3"
          stroke="white"
          strokeWidth="1.7"
          strokeLinecap="round"
        />
      </svg>
      <span>
        village<span className="wordmark-light">vidya</span>
        <span className="blue-text">.</span>
      </span>
    </span>
  );
}
export function Eyebrow({
  children,
  icon = false,
}: {
  children: ReactNode;
  icon?: boolean;
}) {
  return (
    <p className="eyebrow">
      {icon && <Sparkles size={15} strokeWidth={1.5} />} {children}
    </p>
  );
}
export function ArrowLink({
  children,
  to,
}: {
  children: ReactNode;
  to: string;
}) {
  return (
    <Link className="arrow-link" to={to}>
      {children}
      <ArrowUpRight size={17} />
    </Link>
  );
}
export function Progress({ value, label }: { value: number; label: string }) {
  return (
    <div
      className="progress"
      role="progressbar"
      aria-valuenow={value}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={label}
    >
      <span style={{ width: `${value}%` }} />
    </div>
  );
}
export function Modal({
  open,
  onClose,
  title,
  children,
  wide = false,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  wide?: boolean;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);
  useEffect(() => {
    if (!open) return;
    const old = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = old;
    };
  }, [open]);
  return (
    <dialog
      ref={ref}
      className={`dialog ${wide ? "dialog-wide" : ""}`}
      onCancel={onClose}
      aria-labelledby={titleId}
      onClick={(e) => {
        if (e.target === ref.current) {
          const r = ref.current.getBoundingClientRect();
          if (
            e.clientX < r.left ||
            e.clientX > r.right ||
            e.clientY < r.top ||
            e.clientY > r.bottom
          )
            onClose();
        }
      }}
    >
      <div className="dialog-top">
        <h2 id={titleId}>{title}</h2>
        <button
          className="icon-button"
          onClick={onClose}
          aria-label="Close dialog"
        >
          <X size={21} />
        </button>
      </div>
      {children}
    </dialog>
  );
}
export function EmptyState({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children?: ReactNode;
}) {
  return (
    <div className="empty-state">
      <BookOpen size={30} strokeWidth={1.3} />
      <h2>{title}</h2>
      <p>{description}</p>
      {children}
    </div>
  );
}
export function Avatar({
  name,
  color = "peach",
  size = "",
}: {
  name: string;
  color?: string;
  size?: string;
}) {
  return (
    <span className={`avatar ${color} ${size}`} aria-hidden="true">
      <svg viewBox="0 0 80 80" fill="none">
        <circle
          cx="40"
          cy="82"
          r="29"
          fill={
            color === "sage"
              ? "#547360"
              : color === "blue"
                ? "#315cfd"
                : color === "lilac"
                  ? "#777089"
                  : "#345af1"
          }
        />
        <path
          d="M28 34c-4-18 28-21 28 1v8c0 12-8 18-15 18S27 53 27 43Z"
          fill="#DCA787"
        />
        <path
          d="M25 39C14 19 34 9 45 13c17-1 19 22 11 27l-3-16c-8 6-18 3-22 12l-1 12-5-9Z"
          fill="#393A35"
        />
        <path
          d="M40 46h4M39 51c3 2 6 1 8-1"
          stroke="#664A3F"
          strokeWidth="1.5"
          strokeLinecap="round"
        />
        <circle cx="36" cy="40" r="1.4" fill="#393A35" />
        <circle cx="49" cy="40" r="1.4" fill="#393A35" />
      </svg>
      <span className="sr-only">{name}</span>
    </span>
  );
}
