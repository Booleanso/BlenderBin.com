import React from "react";

const TabComponent: React.FC = () => {
  const sections = [
    {
      title: "Tab, tab, tab",
      description:
        "Cursor lets you breeze through changes by predicting your next edit.",
      video: "/path-to-your-video1.mp4",
    },
    {
      title: "Edit, edit, edit",
      description:
        "Seamlessly make changes to your projects with cutting-edge tools.",
      video: "/path-to-your-video2.mp4",
    },
    {
      title: "Focus, focus, focus",
      description: "Stay in the flow with tools that anticipate your next move.",
      video: "/path-to-your-video3.mp4",
    },
  ]; // Customize each section's title, description, and video path

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-black text-white">
      {/* Stacked Sections */}
      <div className="space-y-16 w-full">
        {sections.map((section, index) => (
          <div key={index} className="flex flex-col items-center">
            {/* Heading and Subheading */}
            <div className="text-center mb-8">
              <h1 className="text-4xl font-bold mb-4">{section.title}</h1>
              <p className="text-lg text-gray-400">{section.description}</p>
            </div>

            {/* Gradient Container with Video */}
            <div className="rounded-lg overflow-hidden shadow-lg w-[80%] max-w-4xl h-[500px] bg-gradient-to-br from-yellow-500 via-pink-500 to-purple-700 flex items-center justify-center">
              <video
                className="w-full h-full rounded-lg"
                controls
                autoPlay
                muted
                loop
              >
                <source src={section.video} type="video/mp4" />
                Your browser does not support the video tag.
              </video>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default TabComponent;
