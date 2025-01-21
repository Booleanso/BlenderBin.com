'use client';

import Image from 'next/image';
import Link from 'next/link';
import { FC } from 'react';

interface NewsletterProps {
  title: string;
  description: string;
  author: string;
  readTime: string;
  authorImage?: string;
}

const Newsletter: FC<NewsletterProps> = ({
  title,
  description,
  author,
  readTime,
  authorImage
}) => {
  return (
    <div className="bg-zinc-900 rounded-xl p-8 max-w-4xl">
      <div className="flex flex-col lg:flex-row gap-8">
        <div className="flex-1 space-y-6">
          {/* Blog Label */}
          <div className="flex items-center gap-2">
            <svg
              className="w-4 h-4 text-gray-400"
              fill="none"
              strokeWidth="2"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9.5a2 2 0 00-2-2h-2"
              />
            </svg>
            <span className="text-gray-400 text-sm uppercase tracking-wider">Blog</span>
          </div>

          {/* Title and Description */}
          <div className="space-y-4">
            <h2 className="text-3xl font-bold text-white">{title}</h2>
            <p className="text-gray-400 text-sm leading-relaxed">
              {description}
            </p>
          </div>

          {/* CTA Button */}
          <Link 
            href="#" 
            className="inline-block bg-zinc-800 hover:bg-zinc-700 text-white px-4 py-2 rounded text-sm transition-colors"
          >
            KEEP READING
          </Link>

          {/* Author Info */}
          <div className="flex items-center gap-4 pt-8">
            <div className="w-10 h-10 rounded-full overflow-hidden bg-zinc-800">
              {authorImage ? (
                <Image
                  src={authorImage}
                  alt={author}
                  width={40}
                  height={40}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-purple-500 to-pink-500" />
              )}
            </div>
            <div className="space-y-1">
              <div className="text-sm text-gray-300">Posted by {author}</div>
              <div className="text-xs text-gray-500">{readTime} read</div>
            </div>
          </div>
        </div>

        {/* Gradient Image */}
        <div className="lg:w-96 h-64 lg:h-auto rounded-xl overflow-hidden">
          <div className="w-full h-full bg-gradient-to-br from-purple-500 via-pink-500 via-yellow-500 to-green-500" />
        </div>
      </div>
    </div>
  );
};

export default Newsletter;