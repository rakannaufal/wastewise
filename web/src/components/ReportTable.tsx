import { ArrowUpRight } from "lucide-react";
import type { Report } from "../types";
import { categoryName, date, Empty, StatusBadge } from "../ui";
export function ReportTable({
  reports,
  open,
}: {
  reports: Report[];
  open: (id: string) => void;
}) {
  if (!reports.length)
    return (
      <Empty title="Belum ada laporan">
        <p>
          Laporan yang kamu buat akan muncul di sini.
          <br />
          Mulai dengan foto dan lokasi sampah.
        </p>
      </Empty>
    );
  return (
    <div className="table-scroll">
      <table className="report-table">
        <thead>
          <tr>
            <th>Material & laporan</th>
            <th>Tanggal</th>
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
                  <img src={report.image_url} alt="" loading="lazy" />
                  <span>
                    <strong>{categoryName(report.category)}</strong>
                    <small>{report.description}</small>
                  </span>
                </button>
              </td>
              <td className="nowrap">{date(report.created_at)}</td>
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
