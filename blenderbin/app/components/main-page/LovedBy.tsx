// TestimonialsGrid.tsx
import Image from 'next/image'
import styles from '../../css/main-page/LovedBy.module.scss'

import GridMotion from '../GridMotion/GridMotion';
  
// note: you'll need to make sure the parent container of this component is sized properly
const items = [
  'Item 1',
  <div key='jsx-item-1'>Custom JSX Content</div>,
  'https://images.unsplash.com/photo-1723403804231-f4e9b515fe9d?q=80&w=3870&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D',
  'Item 2',
  <div key='jsx-item-2'>Custom JSX Content</div>,
  'Item 4',
  <div key='jsx-item-2'>Custom JSX Content</div>,
  'https://images.unsplash.com/photo-1723403804231-f4e9b515fe9d?q=80&w=3870&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D',
  'Item 5',
  <div key='jsx-item-2'>Custom JSX Content</div>,
  'Item 7',
  <div key='jsx-item-2'>Custom JSX Content</div>,
  'https://images.unsplash.com/photo-1723403804231-f4e9b515fe9d?q=80&w=3870&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D',
  'Item 8',
  <div key='jsx-item-2'>Custom JSX Content</div>,
  'Item 10',
  <div key='jsx-item-3'>Custom JSX Content</div>,
  'https://images.unsplash.com/photo-1723403804231-f4e9b515fe9d?q=80&w=3870&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D',
  'Item 11',
  <div key='jsx-item-2'>Custom JSX Content</div>,
  'Item 13',
  <div key='jsx-item-4'>Custom JSX Content</div>,
  'https://images.unsplash.com/photo-1723403804231-f4e9b515fe9d?q=80&w=3870&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D',
  'Item 14',
  // Add more items as needed
];



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
        
      
      </div>
      <GridMotion items={items} />
    </div>
  )
}

export default LovedBy;