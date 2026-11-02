import type { Summary } from "../types";
import { categories, statusName } from "../ui";

export function ReportDistribution({ summary }: { summary: Summary }) {
  const groups = [
    {
      title: "Komposisi material",
      rows: categories.map(({ id, name }) => ({
        id,
        label: name,
        count: summary.by_category[id] ?? 0,
      })),
    },
    {
      title: "Progres penanganan",
      rows: Object.entries(summary.by_status).map(([id, count]) => ({
        id,
        label: statusName[id as keyof typeof statusName],
        count,
      })),
    },
  ];
  return (
    <div className="distribution-grid">
      {groups.map(({ title, rows }) => (
        <section className="panel" key={title} aria-label={title}>
          <h2>{title}</h2>
          <p className="muted">Jumlah laporan dari ringkasan saat ini.</p>
          <dl className="distribution-list">
            {rows.map(({ id, label, count }) => (
              <div key={id}>
                <dt>{label}</dt>
                <dd>
                  <span className="distribution-track" aria-hidden="true">
                    <span
                      style={{
                        width: `${(count / summary.total_reports) * 100}%`,
                      }}
                    />
                  </span>
                  <span>{count}</span>
                </dd>
              </div>
            ))}
          </dl>
        </section>
      ))}
    </div>
  );
}
