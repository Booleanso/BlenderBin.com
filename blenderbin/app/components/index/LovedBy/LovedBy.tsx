// TestimonialsGrid.tsx
// import Image from 'next/image'
import styles from './LovedBy.module.scss'

import GridMotion from '../../GridMotion/GridMotion';
  
// note: you'll need to make sure the parent container of this component is sized properly
const items = [
  <div key="1" className={styles.testimonialCard}>
    <div className={styles.userInfo}>
      <div className={styles.quoteSymbol}>"</div>
      <span className={styles.username}>@mantissa.xyz</span>
    </div>
    <p>BlenderBin's procedural workflow sharing is revolutionary! Perfect for abstract art 🌀</p>
  </div>,
  <div key="2" className={styles.testimonialCard}>
    <div className={styles.userInfo}>
      <div className={styles.quoteSymbol}>"</div>
      <span className={styles.username}>@southernshotty</span>
    </div>
    <p>Teaching Blender has never been easier. The scene sharing is perfect for tutorials! 🎓</p>
  </div>,
  <div key="3" className={styles.testimonialCard}>
    <div className={styles.userInfo}>
      <div className={styles.quoteSymbol}>"</div>
      <span className={styles.username}>@pierrick_picaut</span>
    </div>
    <p>The architectural visualization features are exactly what I needed! 🏛️</p>
  </div>,
  <div key="4" className={styles.testimonialCard}>
    <div className={styles.userInfo}>
      <div className={styles.quoteSymbol}>"</div>
      <span className={styles.username}>@marv.os</span>
    </div>
    <p>BlenderBin's material system is next level. Makes sharing looks so seamless! ✨</p>
  </div>,
  <div key="5" className={styles.testimonialCard}>
    <div className={styles.userInfo}>
      <div className={styles.quoteSymbol}>"</div>
      <span className={styles.username}>@josh_gambrell</span>
    </div>
    <p>Hard surface modeling workflow is so much better with BlenderBin! 🔧</p>
  </div>,
  <div key="6" className={styles.testimonialCard}>
    <div className={styles.userInfo}>
      <div className={styles.quoteSymbol}>"</div>
      <span className={styles.username}>@wayward.art</span>
    </div>
    <p>The addon management system is brilliant. Everything syncs perfectly! 🔄</p>
  </div>,
  <div key="7" className={styles.testimonialCard}>
    <div className={styles.userInfo}>
      <div className={styles.quoteSymbol}>"</div>
      <span className={styles.username}>@lightningboystudio</span>
    </div>
    <p>Perfect for managing NPR shaders and sharing toon styles! 🎨</p>
  </div>,
  <div key="8" className={styles.testimonialCard}>
    <div className={styles.userInfo}>
      <div className={styles.quoteSymbol}>"</div>
      <span className={styles.username}>@os</span>
    </div>
    <p>BlenderBin changed how I share my 3D work. The real-time collaboration is next level! 🚀</p>
  </div>,
  <div key="9" className={styles.testimonialCard}>
    <div className={styles.userInfo}>
      <div className={styles.quoteSymbol}>"</div>
      <span className={styles.username}>@thedizzyviper</span>
    </div>
    <p>Finally a platform that understands 3D artists! The material sharing feature is pure gold ✨</p>
  </div>,
  <div key="10" className={styles.testimonialCard}>
    <div className={styles.userInfo}>
      <div className={styles.quoteSymbol}>"</div>
      <span className={styles.username}>@0xvizion</span>
    </div>
    <p>The node system sharing in BlenderBin is revolutionary. Perfect for teaching and learning! 🎓</p>
  </div>,
  <div key="11" className={styles.testimonialCard}>
    <div className={styles.userInfo}>
      <div className={styles.quoteSymbol}>"</div>
      <span className={styles.username}>@artyomtogo</span>
    </div>
    <p>Love how easy it is to share complex scenes. Version control for 3D files is a game-changer 🔥</p>
  </div>,
  <div key="12" className={styles.testimonialCard}>
    <div className={styles.userInfo}>
      <div className={styles.quoteSymbol}>"</div>
      <span className={styles.username}>@skinny.designwhh</span>
    </div>
    <p>The render farm integration is insane! Saved me hours of rendering time 💫</p>
  </div>,
  <div key="13" className={styles.testimonialCard}>
    <div className={styles.userInfo}>
      <div className={styles.quoteSymbol}>"</div>
      <span className={styles.username}>@spaceheadtr</span>
    </div>
    <p>Best platform for sharing procedural materials. The community features are incredible! 🌟</p>
  </div>,
  <div key="14" className={styles.testimonialCard}>
    <div className={styles.userInfo}>
      <div className={styles.quoteSymbol}>"</div>
      <span className={styles.username}>@disneyprince</span>
    </div>
    <p>The asset management system in BlenderBin is unmatched. Perfect for large projects 📦</p>
  </div>,
  <div key="15" className={styles.testimonialCard}>
    <div className={styles.userInfo}>
      <div className={styles.quoteSymbol}>"</div>
      <span className={styles.username}>@kylec3d</span>
    </div>
    <p>Collaboration has never been easier. The real-time feedback feature is everything! 🤝</p>
  </div>,
  <div key="16" className={styles.testimonialCard}>
    <div className={styles.userInfo}>
      <div className={styles.quoteSymbol}>"</div>
      <span className={styles.username}>@pokraslampas</span>
    </div>
    <p>BlenderBin makes managing multiple projects so smooth. Love the organization features 🎨</p>
  </div>,
  <div key="17" className={styles.testimonialCard}>
    <div className={styles.userInfo}>
      <div className={styles.quoteSymbol}>"</div>
      <span className={styles.username}>@kodykurth</span>
    </div>
    <p>The shader library is incredible! Makes material creation and sharing so efficient ⚡️</p>
  </div>,
  <div key="18" className={styles.testimonialCard}>
    <div className={styles.userInfo}>
      <div className={styles.quoteSymbol}>"</div>
      <span className={styles.username}>@zacfarmer</span>
    </div>
    <p>BlenderBin's version control is a lifesaver. Perfect for managing client revisions 🎯</p>
  </div>,
  <div key="19" className={styles.testimonialCard}>
    <div className={styles.userInfo}>
      <div className={styles.quoteSymbol}>"</div>
      <span className={styles.username}>@davidhlt</span>
    </div>
    <p>BlenderBin's lighting presets library is a game changer. So easy to share and import setups! 💡</p>
  </div>,
  <div key="20" className={styles.testimonialCard}>
    <div className={styles.userInfo}>
      <div className={styles.quoteSymbol}>"</div>
      <span className={styles.username}>@two.shon</span>
    </div>
    <p>The way BlenderBin handles geometry nodes sharing is brilliant. Perfect for modular design! 🔷</p>
  </div>,
  <div key="21" className={styles.testimonialCard}>
    <div className={styles.userInfo}>
      <div className={styles.quoteSymbol}>"</div>
      <span className={styles.username}>@anka</span>
    </div>
    <p>Character rigging collaboration in BlenderBin is unmatched. Makes team animation work so smooth! 🦾</p>
  </div>,
  <div key="22" className={styles.testimonialCard}>
    <div className={styles.userInfo}>
      <div className={styles.quoteSymbol}>"</div>
      <span className={styles.username}>@yansculpts</span>
    </div>
    <p>The sculpting brush preset sharing is amazing! Community features are top notch 🎨</p>
  </div>,
  <div key="23" className={styles.testimonialCard}>
    <div className={styles.userInfo}>
      <div className={styles.quoteSymbol}>"</div>
      <span className={styles.username}>@gleb.alexandrov</span>
    </div>
    <p>BlenderBin's lighting preset system changed my rendering workflow completely! 💡</p>
  </div>,
  <div key="24" className={styles.testimonialCard}>
    <div className={styles.userInfo}>
      <div className={styles.quoteSymbol}>"</div>
      <span className={styles.username}>@gabbitt</span>
    </div>
    <p>Makes sharing tutorial files with students so much easier! 📚</p>
  </div>,
  <div key="25" className={styles.testimonialCard}>
    <div className={styles.userInfo}>
      <div className={styles.quoteSymbol}>"</div>
      <span className={styles.username}>@3ddevon</span>
    </div>
    <p>The animation system sharing is perfect for teaching complex rigs! 🦿</p>
  </div>,
  <div key="26" className={styles.testimonialCard}>
    <div className={styles.userInfo}>
      <div className={styles.quoteSymbol}>"</div>
      <span className={styles.username}>@chrisprenninger</span>
    </div>
    <p>Geometry nodes sharing makes procedural workflows so much better! 📊</p>
  </div>,
  <div key="27" className={styles.testimonialCard}>
    <div className={styles.userInfo}>
      <div className={styles.quoteSymbol}>"</div>
      <span className={styles.username}>@curtisholt</span>
    </div>
    <p>The real-time collaboration features are game-changing for team projects! 🤝</p>
  </div>,
  <div key="28" className={styles.testimonialCard}>
    <div className={styles.userInfo}>
      <div className={styles.quoteSymbol}>"</div>
      <span className={styles.username}>@blenderguru</span>
    </div>
    <p>BlenderBin makes managing complex material libraries effortless! 🎯</p>
  </div>
];


const LovedBy = () => {
  return (
    <div className={styles.lovedBy}>
      <div className={styles.lovedByContainer}>
        <div className={styles.lovedByHeader}>
          <h2>Loved by world-class devs</h2>
          <p>Engineers all around the world reach for Cursor by choice.</p>
        </div>
        
      
      </div>
      <GridMotion items={items} />
    </div>
  )
}

export default LovedBy;