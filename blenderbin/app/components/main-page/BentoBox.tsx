import styles from '../../css/main-page/bento-box.module.scss'
import Image from 'next/image'

interface BentoFeature {
  title: string;
  description?: string;
  icon?: string;
  highlight?: string;
  subtext?: string;
  isLarge?: boolean;
  variant?: 'primary' | 'secondary' | 'accent';
}

const BentoBox = () => {
  const features: BentoFeature[] = [
    {
      title: "Effortless Prompt Perfection",
      highlight: "14 days trial",
      subtext: "after - $5/month",
      variant: "primary",
    },
    {
      title: "Your AI Prompt Companion",
      isLarge: true,
      variant: "accent",
    },
    {
      title: "25M",
      description: "created prompts",
      variant: "secondary",
    },
    {
      title: "12K",
      description: "happy users",
      variant: "primary",
    },
    {
      title: "Generate",
      variant: "accent",
    },
    {
      title: "Branching paths",
      description: "Explore multiple prompt directions with branching.",
      icon: "/icons/branch.svg",
      variant: "primary",
    },
    {
      title: "Keyword enhancer",
      description: "Boost your prompt precision with keywords.",
      icon: "/icons/keyword.svg",
      variant: "secondary",
    },
    {
      title: "Prompt templates",
      description: "Use pre-made templates to jumpstart creativity.",
      variant: "primary",
    },
  ];

  return (
    <section className={styles.bentoContainer}>
      <div className={styles.bentoGrid}>
        {features.map((feature, index) => (
          <div
            key={index}
            className={`${styles.bentoItem} 
              ${feature.isLarge ? styles.large : ''} 
              ${styles[feature.variant || 'primary']}`}
          >
            {feature.icon && (
              <div className={styles.iconWrapper}>
                <Image
                  src={feature.icon}
                  alt=""
                  width={24}
                  height={24}
                  className={styles.icon}
                />
              </div>
            )}
            
            <div className={styles.content}>
              {feature.highlight && (
                <span className={styles.highlight}>{feature.highlight}</span>
              )}
              <h3 className={styles.title}>{feature.title}</h3>
              {feature.description && (
                <p className={styles.description}>{feature.description}</p>
              )}
              {feature.subtext && (
                <span className={styles.subtext}>{feature.subtext}</span>
              )}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
};

export default BentoBox;
