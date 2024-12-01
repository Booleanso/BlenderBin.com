// app/about/page.tsx
import { Metadata } from 'next'
import Image from 'next/image'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'About | YourSaaS',
  description: 'Learn about our mission, team, and the story behind YourSaaS.',
}

export default function AboutPage() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
      {/* Hero Section */}
      <div className="px-6 py-24 sm:px-6 sm:py-32 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <h1 className="text-4xl font-bold tracking-tight text-gray-900 sm:text-6xl">
            Building the Future of{' '}
            <span className="text-blue-600">Collaboration</span>
          </h1>
          <p className="mt-6 text-lg leading-8 text-gray-600">
            We are a team of passionate individuals driven by the belief that great software
            can transform how teams work together. Our platform helps thousands of companies
            deliver better results, faster.
          </p>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="mx-auto max-w-7xl px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 gap-8 sm:grid-cols-3">
          <div className="flex flex-col items-center p-8 bg-white rounded-2xl shadow-sm ring-1 ring-gray-200">
            <div className="text-4xl font-bold text-gray-900">500+</div>
            <div className="mt-2 text-base text-gray-600">Enterprise Clients</div>
          </div>
          <div className="flex flex-col items-center p-8 bg-white rounded-2xl shadow-sm ring-1 ring-gray-200">
            <div className="text-4xl font-bold text-gray-900">30+</div>
            <div className="mt-2 text-base text-gray-600">Countries Served</div>
          </div>
          <div className="flex flex-col items-center p-8 bg-white rounded-2xl shadow-sm ring-1 ring-gray-200">
            <div className="text-4xl font-bold text-gray-900">99.9%</div>
            <div className="mt-2 text-base text-gray-600">Uptime SLA</div>
          </div>
        </div>
      </div>

      {/* Team Section */}
      <div className="mx-auto max-w-7xl px-6 lg:px-8 py-24">
        <div className="mx-auto max-w-2xl lg:mx-0">
          <h2 className="text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
            Meet Our Team
          </h2>
          <p className="mt-6 text-lg leading-8 text-gray-600">
            We are a diverse team of engineers, designers, and problem solvers.
          </p>
        </div>
        <div className="mx-auto grid max-w-7xl grid-cols-1 gap-x-8 gap-y-12 sm:grid-cols-2 lg:grid-cols-3 mt-16">
          {[1, 2, 3].map((member) => (
            <div key={member} className="relative">
              <Image
                src={`/api/placeholder/400/400`}
                alt="Team member"
                width={400}
                height={400}
                className="aspect-square w-full rounded-2xl object-cover"
              />
              <div className="mt-4">
                <h3 className="text-lg font-semibold leading-8 text-gray-900">
                  Sarah Johnson
                </h3>
                <p className="text-base leading-7 text-gray-600">CEO & Co-founder</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t border-gray-200 bg-white">
        <div className="mx-auto max-w-7xl px-6 py-12 flex flex-col md:flex-row items-center justify-between lg:px-8">
          <div className="flex gap-6">
            <Link href="#" className="text-gray-400 hover:text-gray-500">
              Twitter
            </Link>
            <Link href="#" className="text-gray-400 hover:text-gray-500">
              GitHub
            </Link>
            <Link href="#" className="text-gray-400 hover:text-gray-500">
              LinkedIn
            </Link>
          </div>
          <p className="mt-8 text-center text-sm leading-5 text-gray-500 md:mt-0">
            &copy; {new Date().getFullYear()} YourSaaS. All rights reserved.
          </p>
        </div>
      </footer>
    </main>
  )
}