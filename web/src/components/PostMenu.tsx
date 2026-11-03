import { useEffect, useRef, useState } from "react";
import { Flag, MoreHorizontal, Pencil, Trash2 } from "lucide-react";
export default function PostMenu({
  owner,
  disabled,
  edit,
  remove,
  report,
}: {
  owner: boolean;
  disabled: boolean;
  edit: () => void;
  remove: () => void;
  report: () => void;
}) {
  const ref = useRef<HTMLDetailsElement>(null);
  const [open, setOpen] = useState(false);
  useEffect(() => {
    if (!open) return;
    function outside(e: PointerEvent) {
      if (ref.current && !ref.current.contains(e.target as Node))
        ref.current.open = false;
    }
    function escape(e: KeyboardEvent) {
      if (e.key === "Escape" && ref.current?.open) {
        ref.current.open = false;
        ref.current.querySelector("summary")?.focus();
      }
    }
    document.addEventListener("pointerdown", outside);
    document.addEventListener("keydown", escape);
    return () => {
      document.removeEventListener("pointerdown", outside);
      document.removeEventListener("keydown", escape);
    };
  }, [open]);
  function choose(action: () => void) {
    if (ref.current) ref.current.open = false;
    action();
  }
  return (
    <details
      ref={ref}
      className="post-menu"
      onToggle={(e) => setOpen(e.currentTarget.open)}
    >
      <summary
        className="icon-button"
        aria-label="Opsi posting"
        title="Opsi posting"
      >
        <MoreHorizontal size={23} />
      </summary>
      <div className="post-menu-options" role="group" aria-label="Aksi posting">
        {owner && (
          <>
            <button disabled={disabled} onClick={() => choose(edit)}>
              <Pencil size={18} />
              Edit
            </button>
            <button disabled={disabled} onClick={() => choose(remove)}>
              <Trash2 size={18} />
              Hapus
            </button>
          </>
        )}
        <button disabled={disabled} onClick={() => choose(report)}>
          <Flag size={18} />
          Laporkan
        </button>
      </div>
    </details>
  );
}
