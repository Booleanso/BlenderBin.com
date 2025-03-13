// TestimonialsGrid.tsx
// import Image from 'next/image'
import styles from './LovedBy.module.scss'

import GridMotion from '../../GridMotion/GridMotion'; 
  
// note: you'll need to make sure the parent container of this component is sized properly
const items = [
  <div key="1" className={styles.testimonialCard}>
    <div className={styles.userInfo}>
      <div className={styles.quoteSymbol}>"</div>
      <span className={styles.username}> </span>
    </div>
    <p className={styles.testimonialText}> </p>
  </div>,
  <div key="2" className={styles.testimonialCard}>
    <div className={styles.userInfo}>
      <div className={styles.quoteSymbol}>"</div>
      <span className={styles.username}> </span>
    </div>
    <p className={styles.testimonialText}> </p>
  </div>,
  <div key="3" className={styles.testimonialCard}>
    <div className={styles.userInfo}>
      <div className={styles.quoteSymbol}>"</div>
      <span className={styles.username}>@patrick.casella</span>
    </div>
    <p className={styles.testimonialText}>"What you are building, what this is going to be, is incredible. I'm so excited for this to come out."</p>
  </div>,
  <div key="4" className={styles.testimonialCard}>
    <div className={styles.userInfo}>
      <div className={styles.quoteSymbol}>"</div>
      <span className={styles.username}>@lockhz</span>
    </div>
    <p className={styles.testimonialText}>“Crazy Work !”</p>
  </div>,
  <div key="5" className={styles.testimonialCard}>
    <div className={styles.userInfo}>
      <div className={styles.quoteSymbol}>"</div>
      <span className={styles.username}>@svbih</span>
    </div>
    <p className={styles.testimonialText}>“Excited for when it comes out”</p>
  </div>,
  <div key="6" className={styles.testimonialCard}>
    <div className={styles.userInfo}>
      <div className={styles.quoteSymbol}>"</div>
      <span className={styles.username}>@mattpsd</span>
    </div>
    <p className={styles.testimonialText}>“🔥”</p>
  </div>,
  <div key="7" className={styles.testimonialCard}>
    <div className={styles.userInfo}>
      <div className={styles.quoteSymbol}>"</div>
      <span className={styles.username}>@serhii_revenko_</span>
    </div>
    <p className={styles.testimonialText}>“wooww, awesome thank you!”</p>
  </div>,
  <div key="8" className={styles.testimonialCard}>
    <div className={styles.userInfo}>
      <div className={styles.quoteSymbol}>"</div>
      <span className={styles.username}>@ianjalili</span>
    </div>
    <p className={styles.testimonialText}>”Just wanna say love the awesome work, absolutely amazing”</p>
  </div>,
  <div key="9" className={styles.testimonialCard}>
    <div className={styles.userInfo}>
      <div className={styles.quoteSymbol}>"</div>
      <span className={styles.username}>@knbsnn</span>
    </div>
    <p className={styles.testimonialText}>“I hope people create amazing things from points. 👏👏👏”</p>
  </div>,
  <div key="10" className={styles.testimonialCard}>
    <div className={styles.userInfo}>
      <div className={styles.quoteSymbol}>"</div>
      <span className={styles.username}>@knbsnn</span>
    </div>
    <p className={styles.testimonialText}>“As far as I understand, you are doing this with geometry nodes. Your work is great, I like it. You are another dot artist, your work is excellent.”</p>
  </div>,
  <div key="11" className={styles.testimonialCard}>
    <div className={styles.userInfo}>
      <div className={styles.quoteSymbol}>"</div>
      <span className={styles.username}>@KodyKurth</span>
    </div>
    <p className={styles.testimonialText}>“The Best my scanned tree has ever looked 🌳”</p>
  </div>,
  <div key="12" className={styles.testimonialCard}>
    <div className={styles.userInfo}>
      <div className={styles.quoteSymbol}>"</div>
      <span className={styles.username}>@natebrown</span>
    </div>
    <p className={styles.testimonialText}>“Looking EPIC”</p>
  </div>,
  <div key="13" className={styles.testimonialCard}>
    <div className={styles.userInfo}>
      <div className={styles.quoteSymbol}>"</div>
      <span className={styles.username}>@disneyprince</span>
    </div>
    <p className={styles.testimonialText}>“this is next level bro🔥”</p>
  </div>,
  <div key="14" className={styles.testimonialCard}>
    <div className={styles.userInfo}>
      <div className={styles.quoteSymbol}>"</div>
      <span className={styles.username}>@evr.lstng</span>
    </div>
    <p className={styles.testimonialText}>“This is sick”</p>
  </div>,
  <div key="15" className={styles.testimonialCard}>
    <div className={styles.userInfo}>
      <div className={styles.quoteSymbol}>"</div>
      <span className={styles.username}>@exorcist3d</span>
    </div>
    <p className={styles.testimonialText}>“Hey man, your addon looks fuckin incredible, would it be possible for me to get my hands on it? Signed up for the waitlist!”</p>
  </div>,
  <div key="16" className={styles.testimonialCard}>
    <div className={styles.userInfo}>
      <div className={styles.quoteSymbol}>"</div>
      <span className={styles.username}>@lorenzotorralva</span>
    </div>
    <p className={styles.testimonialText}>“Bruhhhhhh”</p>
  </div>,
  <div key="17" className={styles.testimonialCard}>
    <div className={styles.userInfo}>
      <div className={styles.quoteSymbol}>"</div>
      <span className={styles.username}>@shaunfuqua</span>
    </div>
    <p className={styles.testimonialText}>“So I'm really looking forward to this bc I want to use it for when I do social posts for a renovation client I have - doing a scan type of thing and this is AWESOME!”</p>
  </div>,
  <div key="18" className={styles.testimonialCard}>
    <div className={styles.userInfo}>
      <div className={styles.quoteSymbol}>"</div>
      <span className={styles.username}>@thirdeyevisualsau</span>
    </div>
    <p className={styles.testimonialText}>“Just watched the video, looks awesome. I'll keep an eye out for when it drops!”</p>
  </div>,
  <div key="19" className={styles.testimonialCard}>
    <div className={styles.userInfo}>
      <div className={styles.quoteSymbol}>"</div>
      <span className={styles.username}>@Mecatommy</span>
    </div>
    <p className={styles.testimonialText}>“This is awesome, I think it would be cool to have like a library with nuts, bolts and other stuff to add details to other bigger models!”</p>
  </div>,
  <div key="20" className={styles.testimonialCard}>
    <div className={styles.userInfo}>
      <div className={styles.quoteSymbol}>"</div>
      <span className={styles.username}>@mihailoandic</span>
    </div>
    <p className={styles.testimonialText}>“Love the idea”</p>
  </div>,
  <div key="21" className={styles.testimonialCard}>
    <div className={styles.userInfo}>
      <div className={styles.quoteSymbol}>"</div>
      <span className={styles.username}>@crstlvns</span>
    </div>
    <p className={styles.testimonialText}>“What's this beauty?”</p>
  </div>,
  <div key="22" className={styles.testimonialCard}>
    <div className={styles.userInfo}>
      <div className={styles.quoteSymbol}>"</div>
      <span className={styles.username}>@minibaym</span>
    </div>
    <p className={styles.testimonialText}>“😍”</p>
  </div>,
  <div key="23" className={styles.testimonialCard}>
    <div className={styles.userInfo}>
      <div className={styles.quoteSymbol}>"</div>
      <span className={styles.username}>@oscarzabala</span>
    </div>
    <p className={styles.testimonialText}>"I have love watching the progression of your work 💪🙌"</p>
  </div>,
  <div key="24" className={styles.testimonialCard}>
    <div className={styles.userInfo}>
      <div className={styles.quoteSymbol}>"</div>
      <span className={styles.username}>@todd.pham</span>
    </div>
    <p className={styles.testimonialText}>“Can’t wait!”</p>
  </div>,
  <div key="25" className={styles.testimonialCard}>
    <div className={styles.userInfo}>
      <div className={styles.quoteSymbol}>"</div>
      <span className={styles.username}>@ random name</span>
    </div>
    <p className={styles.testimonialText}> random quote </p>
  </div>,
  <div key="26" className={styles.testimonialCard}>
    <div className={styles.userInfo}>
      <div className={styles.quoteSymbol}>"</div>
      <span className={styles.username}>@kevinvincentvera</span>
    </div>
    <p className={styles.testimonialText}>BlenderBin is a new caliber of addon. It's meant to change the space immensely.</p>
  </div>,
  <div key="27" className={styles.testimonialCard}>
    <div className={styles.userInfo}>
      <div className={styles.quoteSymbol}>"</div>
      <span className={styles.username}>@zacfarmer</span>
    </div>
    <p className={styles.testimonialText}>"I love how it speeds up designer's workflow... this product and BlenderBin as a whole, is absolutely game changing."</p>
  </div>,
  <div key="28" className={styles.testimonialCard}>
    <div className={styles.userInfo}>
      <div className={styles.quoteSymbol}>"</div>
      <span className={styles.username}>@blenderguru</span>
    </div>
    <p className={styles.testimonialText}>BlenderBin makes managing complex material libraries effortless! 🎯</p>
  </div>
];


const LovedBy = () => {
  return (
    <div className={styles.lovedBy}>
      <div className={styles.lovedByContainer}>
        <div className={styles.lovedByHeader}>
          <h2>Loved by 3D artists worldwide</h2>
          <p>Blender creators choose BlenderBin to share and collaborate.</p>
        </div>
      </div>
      <GridMotion items={items} />
    </div>
  )
}

export default LovedBy;