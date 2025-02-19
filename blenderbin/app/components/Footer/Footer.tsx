// app/components/Footer.tsx
import Link from 'next/link'
import './Footer.css'

type FooterLinkProps = {
  href: string
  children: React.ReactNode
}

const FooterLink = ({ href, children }: FooterLinkProps) => (
  <Link href={href} className="footer-link">
    {children}
  </Link>
)

type FooterSectionProps = {
  title: string
  links: {
    href: string
    label: string
  }[]
}

const FooterSection = ({ title, links }: FooterSectionProps) => (
  <div className="footer-section">
    <h3>{title}</h3>
    <div className="footer-links">
      {links.map((link) => (
        <FooterLink key={link.href} href={link.href}>
          {link.label}
        </FooterLink>
      ))}
    </div>
  </div>
)

export default function Footer() {
  return (
    <footer className="footer">
      <div className="footer-cta">
        <div className="footer-cta-content">
          <h2 className="footer-cta-title">Try BlenderBin Now</h2>
          <Link href="/download" className="footer-cta-button">
            <span>DOWNLOAD FOR FREE</span>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
              <path d="M7 17L17 7M17 7H7M17 7V17" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </Link>
        </div>
        <div className="footer-cta-image" aria-hidden="true" />
      </div>

      <div className="footer-content">
        <div className="footer-sections">
          <div className="footer-section">
            <h3>Product</h3>
            <div className="footer-links">
              <Link href="/pricing" className="footer-link">Pricing</Link>
              {/* <Link href="/downloads" className="footer-link">Downloads</Link> */}
              <Link href="/docs" className="footer-link">Docs</Link>
              <Link href="/forum" className="footer-link">Feedback</Link>
            </div>
          </div>
          
          <div className="footer-section">
            <h3>Socials</h3>
            <div className="footer-links">
              <Link href="https://instagram.com/blenderbin" className="footer-link">Instagram</Link>
              <Link href="https://twitter.com/blenderbin" className="footer-link">Twitter</Link>
              <Link href="https://github.com/blenderbin" className="footer-link">GitHub</Link>
            </div>
          </div>
          
          <div className="footer-section">
            <h3>Resources</h3>
            <div className="footer-links">
              <Link href="/terms" className="footer-link">Terms</Link>
              <Link href="/privacy" className="footer-link">Privacy</Link>
            </div>
          </div>
          
          <div className="footer-section">
            <h3>Contact</h3>
            <div className="footer-links">
              <Link href="mailto:hello@blenderbin.com" className="footer-link">hello@blenderbin.com</Link>
              <div className="footer-link">Made by WebRend 💓</div>
            </div>
          </div>
        </div>
      </div>
    </footer>
  )
}