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
      title: "See If It Benefits You",
      highlight: "7 days free trial",
      subtext: "Experiment with our premium add-ons freely.",
      variant: "secondary",
    },
    {
      title: "Only one subscription.",
      isLarge: true,
      variant: "accent",
    },
    {
      title: "200+",
      highlight: "New add-ons released every month!",
      description: "by Year One",
      variant: "secondary",
    },
    {
      title: "Only $14",
      highlight: "Familiar Pricing",
      description: "per month, nothing more nothing less.",
      variant: "primary",
    },
    {
      title: "Serverside controlled",
      description: "Launch add-ons securely in separate threads, in Blender's memory.",
      highlight: "SHA-265 and HTTPS secure",
      variant: "primary",
    },
    {
      title: "Browse via our add-on browser",
      description: "Always adding add-ons, be sure to stay updated!",
      highlight: "Pick anyone you want.",
      // icon: "/icons/keyword.svg",
      variant: "secondary",
    },
    {
      title: "Creators Program coming soon",
      highlight: "Coming soon",
      description: "Host your own Blender add-on on BlenderBin securely and get paid!",
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
