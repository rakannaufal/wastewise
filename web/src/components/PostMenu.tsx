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
        setOpen(false);
    }
    function escape(e: KeyboardEvent) {
      if (e.key !== "Escape") return;
      setOpen(false);
      ref.current?.querySelector("summary")?.focus();
    }
    document.addEventListener("pointerdown", outside);
    document.addEventListener("keydown", escape);
    return () => {
      document.removeEventListener("pointerdown", outside);
      document.removeEventListener("keydown", escape);
    };
  }, [open]);
  function choose(action: () => void) {
    setOpen(false);
    action();
  }
  return (
    <details ref={ref} className="post-menu" open={open}>
      <summary
        className="icon-button"
        aria-label="Opsi posting"
        title="Opsi posting"
        onClick={(e) => {
          e.preventDefault();
          setOpen((value) => !value);
        }}
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
