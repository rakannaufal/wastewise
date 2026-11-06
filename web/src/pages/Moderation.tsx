import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { ArrowUpRight } from "lucide-react";
import { api } from "../api";
import { useAuth } from "../Auth";
import { Empty, Failure, Loading, date } from "../ui";
export default function Moderation() {
  const { user } = useAuth();
  const query = useQuery({
    queryKey: ["community", "flags"],
    queryFn: ({ signal }) =>
      api<
        { id: string; post_id: string; reason: string; created_at: string }[]
      >("/api/v1/admin/community/flags", { signal }),
    enabled: user?.role === "admin",
  });
  if (user?.role !== "admin") return <p>Akses pengelola diperlukan.</p>;
  return (
    <section className="admin-moderation" aria-labelledby="moderation-title">
      <header className="page-heading">
        <div>
          <h1 id="moderation-title">Moderasi komunitas</h1>
          <p>Tinjau alasan laporan konten. Keputusan disimpan dalam audit.</p>
        </div>
      </header>
      {query.isPending ? (
        <Loading />
      ) : query.error ? (
        <Failure error={query.error} retry={() => void query.refetch()} />
      ) : query.data.length === 0 ? (
        <div className="panel admin-moderation-empty">
          <Empty title="Tidak ada konten untuk ditinjau">
            Laporan konten baru akan muncul di sini.
          </Empty>
        </div>
      ) : (
        <ul
          className="admin-moderation-list"
          aria-label="Konten yang dilaporkan"
        >
          {query.data.map((flag) => (
            <li key={flag.id}>
              <article className="panel admin-moderation-item">
                <div className="admin-moderation-meta">
                  <span>Alasan laporan</span>
                  <time dateTime={flag.created_at}>
                    {date(flag.created_at)}
                  </time>
                </div>
                <p>{flag.reason}</p>
                <Link
                  className="button secondary"
                  to={`/community/${flag.post_id}`}
                >
                  Tinjau posting
                  <ArrowUpRight size={16} aria-hidden="true" />
                </Link>
              </article>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
