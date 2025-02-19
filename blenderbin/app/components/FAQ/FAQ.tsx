'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

interface FAQItemProps {
  question: string
  answer: string
  isOpen: boolean
  onToggle: () => void
}

const FAQItem = ({ question, answer, isOpen, onToggle }: FAQItemProps) => {
  return (
    <div className="border-b border-gray-800">
      <button
        className="w-full py-4 flex justify-between items-center text-left text-white"
        onClick={onToggle}
      >
        <span>{question}</span>
        <svg
          className={`w-4 h-4 transform transition-transform ${
            isOpen ? 'rotate-180' : ''
          }`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M19 9l-7 7-7-7"
          />
        </svg>
      </button>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="pb-4 text-gray-300"
          >
            {answer}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

const FAQ = () => {
  const [openIndex, setOpenIndex] = useState<number | null>(null)

  const faqData = [
    {
      question: 'Is it accessible?',
      answer: 'Yes, this FAQ component is built with accessibility in mind, using semantic HTML and ARIA attributes.',
    },
    {
      question: 'Is it styled?',
      answer: 'Yes, this component is styled using Tailwind CSS and matches the dark theme shown in the image.',
    },
    {
      question: 'Is it animated?',
      answer: 'Yes, this component uses Framer Motion for smooth animations when opening and closing the answers.',
    },
  ]

  return (
    <div className="max-w-2xl mx-auto">
      {faqData.map((item, index) => (
        <FAQItem
          key={index}
          question={item.question}
          answer={item.answer}
          isOpen={openIndex === index}
          onToggle={() => setOpenIndex(openIndex === index ? null : index)}
        />
      ))}
    </div>
  )
}

export default FAQ
