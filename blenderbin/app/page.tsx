// import Image from "next/image";
import "./css/main-page/hero-section.css";
import "./css/main-page/about-section.css";
import "./css/main-page/blender-screen.css";


export default function Home() {
  return (
    <div className="body-main">
      <section className="hero-section"> 
        <iframe
          className="spline"
          src="https://my.spline.design/blenderbincopy-1749f0bebc4ffdbe4c9fb47c98860979/"
          width="100%"
          height="100%"
          style={{ border: 'none' }}
          allowFullScreen
        ></iframe>
        <div className="hero-desc">
          <div className="new-tag">SPANKING NEW</div>
          <h1 className="hero-title">All your Blender addons under one subscription.</h1>
          <p>You thought Gojo saw infinity? Wait till you see this.</p>
          <div className="hero-buttons">
            <button className="trial-button">Start Your Free Trial</button>
            <button className="explore-button">Explore Add-Ons</button>    
          </div>
        </div>
      </section>

      <section className="blender-screen">
        <div className="screen-container">
          <div className="actual-screne">

          </div>
        </div>
      </section>


      <section className="quick-about">
        {/* <Image>

        </Image> */}
        <h1 className="about-title">Designed to fix annoyances.</h1>
        <p className="about-paragraph">The creators for BlenderBin thought of nan idea, to bring together an addon library that focuses on easy addons that everyone needs, but no one wants to pay for individually. So, we introduced a subscription model.</p>
        <button className="see-subscriptions">See Subscriptions</button>  
      </section>


    </div>
  );
}
