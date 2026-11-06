import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../api";
import type { Pagination, User } from "../types";
import { Dialog, Failure, Loading } from "../ui";
import { useAuth } from "../Auth";
export default function Users() {
  const [page, setPage] = useState(1);
  const [target, setTarget] = useState<User | null>(null);
  const { user } = useAuth();
  const client = useQueryClient();
  const query = useQuery({
    queryKey: ["users", page],
    queryFn: () =>
      api<{ users: User[]; pagination: Pagination }>(
        `/api/v1/users?page=${page}`,
      ),
  });
  const update = useMutation({
    mutationFn: ({ id, role }: { id: string; role: string }) =>
      api(`/api/v1/users/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ role }),
      }),
    onSuccess: () => client.invalidateQueries({ queryKey: ["users"] }),
  });
  const remove = useMutation({
    mutationFn: (id: string) =>
      api(`/api/v1/users/${id}`, { method: "DELETE" }),
    onSuccess: async () => {
      setTarget(null);
      await client.invalidateQueries();
    },
  });
  if (user?.role !== "admin") return <p>Akses pengelola diperlukan.</p>;
  return (
    <>
      <div className="page-heading">
        <div>
          <span className="eyebrow">Administrasi</span>
          <h1>Pengguna</h1>
          <p className="muted">
            Atur peran akun. Setidaknya satu pengelola harus tetap aktif.
          </p>
        </div>
      </div>
      {update.isError && <Failure error={update.error} />}
      <section className="panel">
        {query.isPending ? (
          <Loading />
        ) : query.isError ? (
          <Failure error={query.error} retry={() => query.refetch()} />
        ) : (
          <>
            <div className="table-scroll">
              <table>
                <thead>
                  <tr>
                    <th>Nama & email</th>
                    <th>Peran</th>
                    <th>Tindakan</th>
                  </tr>
                </thead>
                <tbody>
                  {query.data.users.map((item) => (
                    <tr key={item.id}>
                      <td>
                        <strong>{item.full_name}</strong>
                        <small className="block muted">{item.email}</small>
                      </td>
                      <td>
                        <select
                          aria-label={`Peran ${item.full_name}`}
                          value={item.role}
                          disabled={update.isPending}
                          onChange={(e) =>
                            update.mutate({ id: item.id, role: e.target.value })
                          }
                        >
                          <option value="user">Pengguna</option>
                          <option value="admin">Pengelola</option>
                        </select>
                      </td>
                      <td>
                        <button
                          className="text-button danger-text"
                          onClick={() => setTarget(item)}
                        >
                          Hapus
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <footer className="pagination">
              <span>{query.data.pagination.total_items} pengguna</span>
              <div>
                <button
                  className="button secondary"
                  disabled={page === 1}
                  onClick={() => setPage(page - 1)}
                >
                  Sebelumnya
                </button>
                <button
                  className="button secondary"
                  disabled={page >= query.data.pagination.total_pages}
                  onClick={() => setPage(page + 1)}
                >
                  Berikutnya
                </button>
              </div>
            </footer>
          </>
        )}
      </section>
      {target && (
        <Dialog
          title={`Hapus ${target.full_name}?`}
          onClose={() => setTarget(null)}
        >
          <p>
            Akun beserta seluruh laporannya akan dihapus. Tindakan ini tidak
            dapat dibatalkan.
          </p>
          {remove.isError && <Failure error={remove.error} />}
          <div className="dialog-actions">
            <button
              className="button secondary"
              onClick={() => setTarget(null)}
            >
              Batal
            </button>
            <button
              className="button danger"
              disabled={remove.isPending}
              onClick={() => remove.mutate(target.id)}
            >
              Hapus akun
            </button>
          </div>
        </Dialog>
      )}
    </>
  );
}
