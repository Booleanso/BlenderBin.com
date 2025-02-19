import Image from 'next/image'

const Trusted = () => {
  const topRowLogos = [
    { src: '/logos/odesza.svg', alt: 'ODESZA' },
    { src: '/logos/marvstudio.svg', alt: 'Marv Studio' },
    { src: '/logos/webrend.svg', alt: 'WebRend' },
    { src: '/logos/blender.svg', alt: 'Blender' },
    { src: '/logos/dopesheet.svg', alt: 'DopeSheet' },
  ]

  const bottomRowLogos = [
    { src: '/logos/racehaven.svg', alt: 'Race Haven' },
    { src: '/logos/profectumedia.svg', alt: 'Profectu Media' },
    { src: '/logos/amazon.svg', alt: 'Amazon' },
    { src: '/logos/vercel.svg', alt: 'Vercel' },
  ]

  return (
    <section className="w-full bg-black py-16">
      <div className="container mx-auto px-4">
        <h2 className="text-center text-gray-400 text-sm tracking-wider mb-12">
          TRUSTED BY ENGINEERS AT
        </h2>
        
        <div className="flex flex-col gap-12">
          {/* Top row logos */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-8 items-center justify-items-center">
            {topRowLogos.map((logo) => (
              <div key={logo.alt} className="w-32 h-8 relative">
                <Image
                  src={logo.src}
                  alt={logo.alt}
                  fill
                  className="object-contain filter brightness-50 hover:brightness-100 transition-all"
                />
              </div>
            ))}
          </div>

          {/* Bottom row logos */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 items-center justify-items-center">
            {bottomRowLogos.map((logo) => (
              <div key={logo.alt} className="w-32 h-8 relative">
                <Image
                  src={logo.src}
                  alt={logo.alt}
                  fill
                  className="object-contain filter brightness-50 hover:brightness-100 transition-all"
                />
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}

export default Trusted
