import InfiniteScroll from '../ui/InfiniteScroll';
  
const items = [
  { content: "Text Item 1" },
  { content: <p>Paragraph Item 2</p> },
  { content: "Text Item 3" },
  { content: <p>Paragraph Item 4</p> },
  { content: "Text Item 5" },
  { content: <p>Paragraph Item 6</p> },
  { content: "Text Item 7" },
  { content: <p>Paragraph Item 8</p> },
  { content: "Text Item 9" },
  { content: <p>Paragraph Item 10</p> },
  { content: "Text Item 11" },
  { content: <p>Paragraph Item 12</p> },
  { content: "Text Item 13" },
  { content: <p>Paragraph Item 14</p> },
];

import React from "react";

const TabComponent: React.FC = () => {
  const sections = [
    {
      title: "Full Library of Blender Add-ons",
      description:
        "Access a wide range of Blender add-ons, from basic tools to advanced features.",
      type: "scroll",
    },
    {
      title: "Infinite Iterations",
      description:
        "Limitless possibilities built with any add-on you choose.",
      type: "video",
      video: "/path-to-your-video2.mp4",
    },
    {
      title: "No More Huge Paywall",
      description: "One subscription, and all the add-ons you need.",
      type: "custom",
    },
  ];

  const renderSectionContent = (section: any, index: number) => {
    const containerClasses = "rounded-lg overflow-hidden shadow-lg w-[80%] max-w-4xl h-[500px] flex items-center justify-center";

    switch (section.type) {
      case "scroll":
        return (
          <div className={containerClasses}>
            <InfiniteScroll
              items={items}
              isTilted={false}
              tiltDirection='left'
              autoplay={true}
              autoplaySpeed={0.1}
              autoplayDirection="down"
              pauseOnHover={true}
            />
          </div>
        );
      case "video":
        return (
          <div className={containerClasses}>
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
        );
      case "custom":
        return (
          <div className={containerClasses}>
            <div className="text-center p-8">
              <h2 className="text-3xl font-bold mb-4">Custom Content Here</h2>
              <p>Replace this with your desired third section content</p>
            </div>
          </div>
        );
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-black text-white">
      <div className="space-y-16 w-full">
        {sections.map((section, index) => (
          <div key={index} className="flex flex-col items-center">
            <div className="text-center mb-8">
              <h1 className="text-4xl font-bold mb-4">{section.title}</h1>
              <p className="text-lg text-gray-400">{section.description}</p>
            </div>
            {renderSectionContent(section, index)}
          </div>
        ))}
      </div>
    </div>
  );
};

export default TabComponent;
