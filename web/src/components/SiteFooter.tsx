import { Link } from "react-router-dom";
import { Brand } from "../ui";
export default function SiteFooter() {
  return (
    <footer className="site-footer">
      <div className="site-footer-main">
        <div>
          <Link to="/" aria-label="WasteWise, beranda">
            <Brand />
          </Link>
          <p>Satu foto. Satu langkah untuk lingkungan sekitar.</p>
        </div>
        <nav aria-label="Jelajahi WasteWise">
          <strong>Jelajahi</strong>
          <Link to="/app">Komunitas</Link>
          <Link to="/map">Peta laporan</Link>
          <Link to="/guide">Panduan memilah</Link>
        </nav>
        <nav aria-label="Informasi WasteWise">
          <strong>Kenali WasteWise</strong>
          <Link to="/about">Tentang</Link>
          <Link to="/faq">FAQ</Link>
          <Link to="/privacy">Privasi laporan</Link>
          <Link to="/onboarding">Cara menggunakan</Link>
        </nav>
      </div>
      <div className="site-footer-credit">
        © 2026 Khay Brownies · Website by{" "}
        <a
          href="https://www.instagram.com/rakandevv/"
          target="_blank"
          rel="noopener noreferrer"
        >
          rakandev
        </a>
      </div>
    </footer>
  );
}
