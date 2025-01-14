'use client';

import Link from 'next/link';

const Workspaces = () => {

  const navLinks = [
    { href: '/', text: 'HOME' },
    { href: '/features', text: 'FEATURES' },
    { href: '/pricing', text: 'PRICING' },
    { href: '/tutorials', text: 'TUTORIALS' },
    { href: '/sponsors', text: 'SPONSORS' },
    { href: '/faq', text: 'FAQ' },
    { href: '/library', text: 'ADDONS' },
  ];

  return (
    <div className="fixed top-0 left-0 right-0 z-[999] bg-[#181818] h-[23px] w-[98.2%] mx-auto flex items-center justify-between">


      {/* Navigation Links */}
      <div className="flex items-center">
        {navLinks.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className="px-3 h-[20px] flex items-center text-[10px] text-gray-300 hover:bg-[#2A2A2A] border-l border-[#191919]"
          >
            {link.text}
          </Link>
        ))}
      </div>
    </div>
  );
};

export default Workspaces;