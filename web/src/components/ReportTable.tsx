import { ArrowUpRight } from "lucide-react";
import { locationNames } from "../types";
import type { Report } from "../types";
import { categoryName, date, Empty, StatusBadge } from "../ui";
export function ReportTable({
  reports,
  open,
  admin = false,
}: {
  reports: Report[];
  open: (id: string) => void;
  admin?: boolean;
}) {
  if (!reports.length)
    return (
      <Empty
        title={
          admin
            ? "Tidak ada laporan yang perlu ditampilkan"
            : "Belum ada laporan"
        }
      >
        {admin ? (
          <p>Antrean atau filter ini kosong.</p>
        ) : (
          <p>
            Laporan yang kamu buat akan muncul di sini.
            <br />
            Mulai dengan foto dan lokasi sampah.
          </p>
        )}
      </Empty>
    );
  return (
    <div
      className="table-scroll"
      role="region"
      aria-label="Daftar laporan"
      tabIndex={0}
    >
      {admin && (
        <p className="table-swipe-hint">
          Geser tabel untuk melihat pelapor, lokasi dan status.
        </p>
      )}
      <table className={`report-table${admin ? " report-table-admin" : ""}`}>
        <thead>
          <tr>
            <th>Material & laporan</th>
            <th>Tanggal</th>
            {admin && <th>Pelapor & lokasi</th>}
            <th>Status</th>
            <th>
              <span className="sr-only">Tindakan</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {reports.map((report) => (
            <tr key={report.id}>
              <td>
                <button className="report-cell" onClick={() => open(report.id)}>
                  <img
                    src={report.thumbnail_url}
                    alt=""
                    loading="lazy"
                    width={62}
                    height={70}
                  />
                  <span>
                    <strong>{categoryName(report.category)}</strong>
                    <small>{report.description}</small>
                    {report.classification_state === "needs_review" && (
                      <small className="review-label">Perlu review AI</small>
                    )}
                  </span>
                </button>
              </td>
              <td className="nowrap">
                {date(report.created_at)}
                {admin && (
                  <small className="table-metadata">
                    Umur{" "}
                    {Math.max(
                      0,
                      Math.floor(
                        (Date.now() - new Date(report.created_at).getTime()) /
                          3600000,
                      ),
                    )}{" "}
                    jam sejak dibuat
                  </small>
                )}
              </td>
              {admin && (
                <td>
                  <strong>{report.user_name}</strong>
                  <small className="table-metadata">
                    {locationNames[report.location_source]} ·{" "}
                    {report.id.slice(0, 8)}
                  </small>
                </td>
              )}
              <td>
                <StatusBadge value={report.status} />
              </td>
              <td>
                <button
                  className="icon-button"
                  aria-label={`Lihat laporan ${categoryName(report.category)}`}
                  onClick={() => open(report.id)}
                >
                  <ArrowUpRight size={19} />
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
