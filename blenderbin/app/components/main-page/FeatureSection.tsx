import styles from '../../css/main-page/FeatureSection.module.scss';

const FeatureSection = () => {
  return (
    <section className={styles.featureSection}>
      <div className={styles.featureHeader}>
        <h2>Build software faster</h2>
        <p>Intelligent, fast, and familiar, Blender is the best way to code with AI.</p>
        <button className={styles.seeMoreBtn}>SEE MORE FEATURES</button>
      </div>
      
      <div className={styles.featureGrid}>
        <div className={styles.featureCard}>
          <h3>Frontier Intelligence</h3>
          <p>Powered by a mix of purpose-built and frontier models. Blender is smart and fast.</p>
          <div className={styles.featureImage}>
            {/* Add your triangle/prism image here */}
          </div>
        </div>

        <div className={styles.featureCard}>
          <h3>Feels Familiar</h3>
          <p>Import all your extensions, themes, and keybindings in one click.</p>
          <div className={styles.featureImage}>
            {/* Add your window/blocks image here */}
          </div>
        </div>

        <div className={styles.featureCard}>
          <h3>Privacy Options</h3>
          <p>If you enable Privacy Mode, your code is never stored remotely. Blender is SOC 2 certified.</p>
          <div className={styles.featureImage}>
            {/* Add your sphere/circle image here */}
          </div>
        </div>
      </div>
    </section>
  );
};

export default FeatureSection;
