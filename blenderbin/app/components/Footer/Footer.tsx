// app/components/Footer.tsx
import Link from 'next/link'
import Image from 'next/image'
import './Footer.css'



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
        <div className="footer-cta-image" aria-hidden="true">
          <Image 
            src="/helloblenderbin.png" 
            alt="BlenderBin" 
            width={100}
            height={100}
            quality={100}
            style={{ width: '100%', height: '100%', borderRadius: '8px' }}
          />
        </div>
      </div>

      <div className="footer-content">
        <div className="footer-sections">
          <div className="footer-section">
            <h3>Product</h3>
            <div className="footer-links">
              <Link href="/#subscriptions" className="footer-link">Pricing</Link>
              {/* <Link href="/downloads" className="footer-link">Downloads</Link> */}
              <Link href="https://metal-brow-307.notion.site/Docs-1ae4e2e320a68009a994e3d7133448e4?pvs=4" className="footer-link">Docs</Link>
              {/* <Link href="/forum" className="footer-link">Feedback</Link> */}
            </div>
          </div>
          
          <div className="footer-section">
            <h3>Socials</h3>
            <div className="footer-links">
              <Link href="https://instagram.com/blenderbin" className="footer-link">Instagram</Link>
              {/* <Link href="https://twitter.com/blenderbin" className="footer-link">Twitter</Link> */}
              <Link href="https://github.com/WebRendHQ/BlenderBin-Launcher" className="footer-link">GitHub</Link>
            </div>
          </div>
          
          <div className="footer-section">
            <h3>Resources</h3>
            <div className="footer-links">
              <Link href="https://metal-brow-307.notion.site/Terms-and-Conditions-1ae4e2e320a680d7983fec849a6474d0?pvs=4" className="footer-link">Terms</Link>
              {/* <Link href="/privacy" className="footer-link">Privacy</Link> */}
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