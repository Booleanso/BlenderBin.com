'use client';

import Image from 'next/image';
import Link from 'next/link';
import { FC } from 'react';
import styles from './Newsletter.module.scss';

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
    <div className={styles.container}>
      <div className={styles.content}>
        <div className={styles.textContent}>
          {/* Blog Label */}
          <div className={styles.blogLabel}>
            <svg
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
            <span>Blog</span>
          </div>

          {/* Title and Description */}
          <div className={styles.articleContent}>
            <h2>{title}</h2>
            <p>{description}</p>
          </div>

          {/* CTA Button */}
          <Link href="#" className={styles.ctaButton}>
            KEEP READING
          </Link>

          {/* Author Info */}
          <div className={styles.authorInfo}>
            <div className={styles.authorAvatar}>
              {authorImage ? (
                <Image
                  src={authorImage}
                  alt={author}
                  width={40}
                  height={40}
                />
              ) : (
                <div className={styles.avatarFallback} />
              )}
            </div>
            <div className={styles.authorText}>
              <div className={styles.authorName}>Posted by {author}</div>
              <div className={styles.readTime}>{readTime} read</div>
            </div>
          </div>
        </div>

        {/* Gradient Image */}
        <div className={styles.gradientImage}>
          <div className={styles.gradient} />
        </div>
      </div>
    </div>
  );
};

export default Newsletter;