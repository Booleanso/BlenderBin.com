import styles from './FeatureSection.module.scss';
import SpotlightCard from '../../ui/SpotlightCard/SpotlightCard';
  

const FeatureSection = () => {
  return (
    <section className={styles.featureSection}>
      <div className={styles.featureHeader}>
        <h2>Create 3D faster</h2>
        <p>With an infinite number of add-ons at your disposal.</p>
        <button className={styles.seeMoreBtn}>SEE MORE FEATURES</button>
      </div>
      
      <div className={styles.featureGrid}>

        <SpotlightCard className="custom-spotlight-card" spotlightColor="rgba(0, 229, 255, 0.2)">
          <h3>7 Day Free Trial</h3>
          <p>Experience our premium add-ons first hand, for free. Cancel your subscription before 7 days if you do not want to get charged.</p>
          <div className={styles.featureImage}></div>
        </SpotlightCard>
          



        <SpotlightCard className="custom-spotlight-card" spotlightColor="rgba(0, 229, 255, 0.2)">
          <h3>We Believe in Over-whelming Value.</h3>
          <p>One subscription, access to all of our add-ons. 200+ add-ons after year two.</p>
          <div className={styles.featureImage}></div>
        </SpotlightCard>

        <SpotlightCard className="custom-spotlight-card" spotlightColor="rgba(0, 229, 255, 0.2)">
          <h3>Built With Security</h3>
          <p>Add-ons served instantly using an experimental version of WebSocket Secure. Creators program coming soon, with the ability to host your own add-on on BlenderBin.</p>
          <div className={styles.featureImage}></div>
        </SpotlightCard>
      </div>
    </section>
  );
};

export default FeatureSection;
