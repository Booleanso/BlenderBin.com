// app/guides/blender-addons/page.tsx
import type { Metadata } from 'next'


export const metadata: Metadata = {
  title: 'How to Install Blender Addons | Blender Guide',
  description: 'Learn how to install addons in Blender with our step-by-step guide.',
}

const TroubleshootingItem = ({
  title,
  description,
}: {
  title: string
  description: string
}) => (
  <div>
    <h3 className="font-semibold text-gray-900">{title}</h3>
    <p className="text-gray-600">{description}</p>
  </div>
)

export default function BlenderAddonGuidePage(): JSX.Element {
  const troubleshootingItems = [
    {
      title: 'Addon Won\'t Install',
      description: 'Check if the addon is compatible with your Blender version. Try downloading from the official source.',
    },
    {
      title: 'Addon Not Working',
      description: 'Ensure the addon is enabled in preferences. Try restarting Blender after installation.',
    },
    {
      title: 'Installation Failed',
      description: 'Verify you have administrative rights. Check if the .zip file is corrupted.',
    },
  ] as const

  const proTips = [
    'Always backup your Blender settings before installing new addons',
    'Download addons only from trusted sources',
    'Keep track of which addons you\'ve installed',
    'Remove unused addons to maintain performance',
  ] as const

  return (
    <main className="min-h-screen bg-white">
      {/* Hero Section */}
      <div className="relative isolate overflow-hidden bg-gradient-to-b from-violet-100/20">
        <div className="mx-auto max-w-7xl px-6 pb-24 pt-10 sm:pb-32 lg:flex lg:px-8 lg:py-40">
          <div className="mx-auto max-w-2xl lg:mx-0 lg:max-w-xl lg:flex-shrink-0">
            <h1 className="text-4xl font-bold tracking-tight text-gray-900 sm:text-6xl">
              Installing Addons in Blender
            </h1>
            <p className="mt-6 text-lg leading-8 text-gray-600">
              Learn how to enhance your Blender experience by installing addons. This guide covers everything you need to know about adding new features to Blender.
            </p>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="mx-auto max-w-7xl px-6 lg:px-8 py-12">
        <div className="mx-auto max-w-3xl">
          {/* Prerequisites */}
          <section className="mb-12">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Prerequisites</h2>
            <ul className="space-y-3 text-gray-600">
              <li className="flex gap-x-3">
                • Blender installed on your computer (Version 2.8 or higher recommended)
              </li>
              <li className="flex gap-x-3">
                • The addon file you want to install (.zip or .py format)
              </li>
              <li className="flex gap-x-3">
                • Administrative rights on your computer
              </li>
            </ul>
          </section>

          {/* Step-by-Step Guide */}
          <section className="mb-12">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Step-by-Step Installation Guide</h2>
            
            <div className="space-y-8">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-3">1. Open Blender Preferences</h3>
                <p className="text-gray-600 mb-2">
                  • On Windows/Linux: Edit → Preferences<br />
                  • On Mac: Blender → Preferences<br />
                  • Or use the keyboard shortcut: Ctrl + Alt + U (Windows/Linux) or Cmd + , (Mac)
                </p>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-3">2. Navigate to Add-ons</h3>
                <p className="text-gray-600 mb-2">
                  Click on the &quot;Add-ons&quot; tab in the preferences window
                </p>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-3">3. Install the Addon</h3>
                <p className="text-gray-600 mb-2">
                  • Click the &quot;Install...&quot; button at the top of the preferences window<br />
                  • Navigate to your addon file (.zip or .py)<br />
                  • Select the file and click &quot;Install Add-on&quot;
                </p>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-3">4. Enable the Addon</h3>
                <p className="text-gray-600 mb-2">
                  • Find your addon in the list (use the search bar if needed)<br />
                  • Check the box next to the addon name to enable it<br />
                  • Some addons may require a restart of Blender
                </p>
              </div>
            </div>
          </section>

          {/* Troubleshooting */}
          <section className="mb-12">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Common Issues & Solutions</h2>
            <div className="bg-gray-50 rounded-lg p-6 space-y-4">
              {troubleshootingItems.map((item) => (
                <TroubleshootingItem
                  key={item.title}
                  title={item.title}
                  description={item.description}
                />
              ))}
            </div>
          </section>

          {/* Tips */}
          <section className="mb-12">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Pro Tips</h2>
            <div className="space-y-3 text-gray-600">
              {proTips.map((tip) => (
                <p key={tip}>• {tip}</p>
              ))}
            </div>
          </section>
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t border-gray-200 bg-gray-50">
        <div className="mx-auto max-w-7xl px-6 py-12 text-center">
          <p className="text-sm text-gray-500">
            Last updated: {new Date().toLocaleDateString()}
          </p>
        </div>
      </footer>
    </main>
  )
}