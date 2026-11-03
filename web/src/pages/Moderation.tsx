import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { api } from "../api";
import { useAuth } from "../Auth";
import { Failure, Loading, date } from "../ui";
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
    <>
      <div className="page-heading">
        <div>
          <h1>Moderasi komunitas</h1>
          <p>Tinjau alasan laporan konten. Keputusan disimpan dalam audit.</p>
        </div>
      </div>
      {query.isPending ? (
        <Loading />
      ) : query.error ? (
        <Failure error={query.error} retry={() => void query.refetch()} />
      ) : query.data.length === 0 ? (
        <p>Tidak ada laporan konten terbuka.</p>
      ) : (
        query.data.map((f) => (
          <article className="comment" key={f.id}>
            <small>{date(f.created_at)}</small>
            <p>{f.reason}</p>
            <Link to={`/community/${f.post_id}`}>Tinjau posting</Link>
          </article>
        ))
      )}
    </>
  );
}
