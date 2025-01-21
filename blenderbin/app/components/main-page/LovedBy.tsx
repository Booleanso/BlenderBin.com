// TestimonialsGrid.tsx
import Image from 'next/image'

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
    <div className="bg-black text-white min-h-screen p-8">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-12">
          <h2 className="text-4xl font-bold mb-4">Loved by world-class devs</h2>
          <p className="text-gray-400">Engineers all around the world reach for Cursor by choice.</p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {testimonials.map((testimonial, index) => (
            <div 
              key={index}
              className="bg-zinc-900 rounded-lg p-6 border border-zinc-800 hover:border-zinc-700 transition-colors"
            >
              <p className="text-gray-300 mb-4">{testimonial.text}</p>
              
              <div className="flex items-center">
                <div className="rounded-full overflow-hidden w-10 h-10 mr-3">
                  <Image
                    src={testimonial.avatar}
                    alt={testimonial.name}
                    width={40}
                    height={40}
                    className="object-cover"
                  />
                </div>
                <div>
                  <h3 className="font-medium">{testimonial.name}</h3>
                  <p className="text-sm text-gray-500">{testimonial.company}</p>
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