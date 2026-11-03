import { useEffect, useRef } from "react";
import type { ReactNode } from "react";
import { AlertCircle, ArrowUpRight, Leaf, LoaderCircle, X } from "lucide-react";
import categories from "../../shared/categories.json";
import type { Status } from "./types";

export { categories };
export const categoryName = (id: string) =>
  categories.find((c) => c.id === id)?.name || id;
export const statusName: Record<Status, string> = {
  Pending: "Menunggu",
  "In Progress": "Diproses",
  Completed: "Selesai",
  Rejected: "Ditolak",
};
export const date = (value: string) =>
  new Intl.DateTimeFormat("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
export function Brand() {
  return (
    <span className="brand">
      <img src="/wastewise-mark.svg" alt="" width="30" height="30" />
      WasteWise<span className="brand-period">.</span>
    </span>
  );
}
export function Loading() {
  return (
    <div className="state" role="status">
      <LoaderCircle className="spin" size={24} />
      Memuat data…
    </div>
  );
}
export function Failure({
  error,
  retry,
}: {
  error: Error;
  retry?: () => void;
}) {
  return (
    <div className="error" role="alert">
      <AlertCircle size={20} />
      <span>{error.message}</span>
      {retry && (
        <button className="text-button" onClick={retry}>
          Coba lagi
        </button>
      )}
    </div>
  );
}
export function StatusBadge({ value }: { value: Status }) {
  return (
    <span
      className={`status status-${value.replaceAll(" ", "").toLowerCase()}`}
    >
      <i />
      {statusName[value]}
    </span>
  );
}
export function Empty({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <div className="empty">
      <span className="empty-mark">
        <Leaf size={28} />
      </span>
      <h3>{title}</h3>
      {children}
    </div>
  );
}
export function NextAction({ category }: { category: string }) {
  const item = categories.find((c) => c.id === category);
  return (
    item && (
      <div className="next-action">
        <ArrowUpRight size={21} />
        <div>
          <strong>Langkah berikutnya</strong>
          <p>{item.action}</p>
        </div>
      </div>
    )
  );
}
export function Dialog({
  title,
  children,
  onClose,
}: {
  title: string;
  children: ReactNode;
  onClose: () => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const previous = document.activeElement as HTMLElement;
    ref.current?.showModal();
    return () => {
      previous?.focus();
    };
  }, []);
  return (
    <dialog
      ref={ref}
      onCancel={onClose}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      aria-labelledby="dialog-title"
    >
      <header>
        <h2 id="dialog-title">{title}</h2>
        <button className="icon-button" aria-label="Tutup" onClick={onClose}>
          <X />
        </button>
      </header>
      {children}
    </dialog>
  );
}
