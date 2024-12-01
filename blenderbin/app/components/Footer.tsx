// app/components/Footer.tsx
import Link from 'next/link'

type FooterLinkProps = {
  href: string
  children: React.ReactNode
}

const FooterLink = ({ href, children }: FooterLinkProps) => (
  <Link 
    href={href} 
    className="block hover:text-gray-900 transition-colors duration-200"
  >
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
  <div className="space-y-4">
    <h3 className="font-medium mb-2">{title}</h3>
    <div className="space-y-3">
      {links.map((link) => (
        <FooterLink key={link.href} href={link.href}>
          {link.label}
        </FooterLink>
      ))}
    </div>
  </div>
)

export default function Footer() {
  const sections = [
    {
      title: 'About',
      links: [
        { href: '/about', label: 'About us' },
        { href: '/how-search-works', label: 'How Search works' },
        { href: '/privacy', label: 'Privacy' },
        { href: '/terms', label: 'Terms' }
      ]
    },
    {
      title: 'Business',
      links: [
        { href: '/advertising', label: 'Advertising' },
        { href: '/business', label: 'Business Solutions' },
        { href: '/services', label: 'Services' },
        { href: '/how-ads-work', label: 'How Ads Work' }
      ]
    },
    {
      title: 'Help',
      links: [
        { href: '/help', label: 'Help Center' },
        { href: '/contact', label: 'Contact Us' },
        { href: '/settings', label: 'Settings' },
        { href: '/feedback', label: 'Feedback' }
      ]
    }
  ]

  return (
    <footer className="w-full bg-gray-100 text-gray-600 text-sm mt-auto">
      <div className="border-b border-gray-300">
        <div className="max-w-7xl mx-auto px-4 py-3">
          <p className="text-gray-500">United States</p>
        </div>
      </div>
      
      <div className="max-w-7xl mx-auto px-4 py-3">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 md:gap-16">
          {sections.map((section) => (
            <FooterSection
              key={section.title}
              title={section.title}
              links={section.links}
            />
          ))}
        </div>
        
        <div className="mt-8 pt-4 border-t border-gray-300 flex flex-col md:flex-row justify-between items-center space-y-4 md:space-y-0">
          <div className="flex items-center space-x-6">
            <FooterLink href="/carbon">
              Carbon neutral since 2007
            </FooterLink>
          </div>
          <div className="flex items-center space-x-6">
            <FooterLink href="/safety">Safety</FooterLink>
            <FooterLink href="/privacy-policy">Privacy Policy</FooterLink>
          </div>
        </div>
      </div>
    </footer>
  )
}