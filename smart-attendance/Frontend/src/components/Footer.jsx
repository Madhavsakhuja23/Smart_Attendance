import { Link } from "react-router-dom";
import BrandLogo from "./BrandLogo";

export default function Footer() {
  return (
    <footer className="site-footer">
      <div className="footer-container">
        <div className="footer-brand">
          <div className="footer-brand-header">
            <BrandLogo className="footer-logo" />
            <h4>Smart Attendance</h4>
          </div>
          <p className="footer-description">
            Automated, real-time student attendance management integrated directly with Google Sheets.
          </p>
          <p className="footer-copyright">
            &copy; {new Date().getFullYear()} Smart Attendance. All rights reserved.
          </p>
        </div>

        <div className="footer-nav-columns">
          <div className="footer-links-group">
            <h5>Product</h5>
            <ul className="footer-links-list">
              <li><Link to="/about">About Us</Link></li>
              <li><Link to="/google-sheets">Google Sheets Add-on</Link></li>
              <li><Link to="/faq">FAQ</Link></li>
              <li><Link to="/support">Support</Link></li>
            </ul>
          </div>

          <div className="footer-links-group">
            <h5>Legal & Security</h5>
            <ul className="footer-links-list">
              <li><Link to="/privacy">Privacy Policy</Link></li>
              <li><Link to="/terms">Terms of Service</Link></li>
              <li><Link to="/cookies">Cookie Policy</Link></li>
              <li><Link to="/security">Security</Link></li>
            </ul>
          </div>
        </div>
      </div>
    </footer>
  );
}
