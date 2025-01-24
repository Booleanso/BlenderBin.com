// TestimonialsGrid.tsx
import Image from 'next/image'
import styles from '../../css/main-page/LovedBy.module.scss'

type Testimonial = {
  name: string;
  company: string;
  text: string;
  avatar: string;
}

const testimonials: Testimonial[] = [
  {
    name: 'Johannes Schickling',
    company: 'Prisma',
    text: 'Cursor is 🔥-ed for real',
    avatar: '/api/placeholder/40/40'
  },
  {
    name: 'Steven Tey',
    company: 'Dub',
    text: 'I really like how Cursor suggests edits to existing code. It noticed I was inconsistent with my markup and popped up this suggestion that matched my other items!',
    avatar: '/api/placeholder/40/40'
  },
  {
    name: 'Morgan McGuire',
    company: 'Weights & Biases',
    text: 'Cursor is awesome!',
    avatar: '/api/placeholder/40/40'
  },
  {
    name: 'Wes Bos',
    company: 'Internet',
    text: "The most useful AI tool that I currently pay for is, hands down, is Cursor. It's fast, autocompletes when and where you need it to, handles brackets properly, sensible keyboard shortcuts, bring-your-own-model...everything is well put together.",
    avatar: '/api/placeholder/40/40'
  },
  {
    name: 'Andrew Milich',
    company: 'Notion',
    text: 'Cursor is so good, and literally gets better/more feature-rich every couple of weeks.',
    avatar: '/api/placeholder/40/40'
  },
  {
    name: 'Zeke Sikelianos',
    company: 'Replicate',
    text: 'Cursor has changed the game. I really can\'t imagine writing code without it at this point. The switch from VSCode is easy, and now I have AI superpowers right in my editor and my terminal.',
    avatar: '/api/placeholder/40/40'
  }
]

const LovedBy = () => {
  return (
    <div className={styles.lovedBy}>
      <div className={styles.lovedByContainer}>
        <div className={styles.lovedByHeader}>
          <h2>Loved by world-class devs</h2>
          <p>Engineers all around the world reach for Cursor by choice.</p>
        </div>
        
        <div className={styles.lovedByGrid}>
          {testimonials.map((testimonial, index) => (
            <div 
              key={index}
              className={styles.lovedByCard}
            >
              <p>{testimonial.text}</p>
              
              <div className={styles.lovedByProfile}>
                <div className={styles.lovedByProfileImage}>
                  <Image
                    src={testimonial.avatar}
                    alt={testimonial.name}
                    width={40}
                    height={40}
                  />
                </div>
                <div className={styles.lovedByProfileInfo}>
                  <h3>{testimonial.name}</h3>
                  <p>{testimonial.company}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export default LovedBy;