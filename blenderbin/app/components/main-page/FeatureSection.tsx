import { FC } from 'react';

interface FeatureCardProps {
  title: string;
  description: string;
  icon: JSX.Element;
}

const FeatureCard: FC<FeatureCardProps> = ({ title, description, icon }) => {
  return (
    <div className="bg-zinc-900 rounded-lg p-8 flex flex-col gap-6">
      <h2 className="text-2xl font-semibold text-white">{title}</h2>
      <p className="text-gray-400 text-sm leading-relaxed">{description}</p>
      <div className="mt-4">
        {icon}
      </div>
    </div>
  );
};

const FeaturesSection: FC = () => {
  return (
    <div className="bg-black min-h-screen text-white py-20 px-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center mb-16">
          <h1 className="text-5xl font-bold mb-4">Build software faster</h1>
          <p className="text-gray-400 mb-8">
            Intelligent, fast, and familiar, Cursor is the best way to code with AI.
          </p>
          <button className="bg-zinc-800 hover:bg-zinc-700 text-white px-4 py-2 rounded-md text-sm">
            SEE MORE FEATURES
          </button>
        </div>

        {/* Features Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <FeatureCard
            title="Frontier Intelligence"
            description="Powered by a mix of purpose-built and frontier models, Cursor is smart and fast."
            icon={
              <div className="relative w-32 h-32">
                <div className="absolute inset-0 bg-gradient-to-br from-purple-500 via-pink-500 to-yellow-500 transform rotate-45 opacity-80" />
                <div className="absolute inset-4 bg-zinc-900" />
              </div>
            }
          />
          
          <FeatureCard
            title="Feels Familiar"
            description="Import all your extensions, themes, and keybindings in one click."
            icon={
              <div className="relative w-32 h-16">
                <div className="absolute right-0 w-16 h-16 bg-gradient-to-r from-blue-500 to-purple-500" />
                <div className="absolute left-0 w-16 h-16 bg-gradient-to-r from-pink-500 to-orange-500" />
              </div>
            }
          />
          
          <FeatureCard
            title="Privacy Options"
            description="If you enable Privacy Mode, your code is never stored remotely. Cursor is SOC 2 certified."
            icon={
              <div className="relative w-24 h-24">
                <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-purple-500 via-pink-500 to-yellow-500 p-1">
                  <div className="h-full w-full bg-zinc-900 rounded-lg" />
                </div>
              </div>
            }
          />
        </div>
      </div>
    </div>
  );
};

export default FeaturesSection;
