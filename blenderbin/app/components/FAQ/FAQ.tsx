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
      question: 'How do I use BlenderBin?',
      answer: 'All you have to do is install it as a normal Blender addon! We provide instructions on how to do this on the Download page.',
    },
    {
      question: 'How do I use each addon you guys have?',
      answer: 'Each addon has its own button in the BlenderBin panel. To see all available add-ons, click "Add-on Browser" on the BlenderBin add-on panel.',
    },
    {
      question: 'How many add-ons do you have?',
      answer: 'We currently are in the single digits, but aim to grow this count past 200+ by early 2026.',
    },
    {
      question: 'How many people are on your team?',
      answer: 'We actually only have two people on our team, and are willing to hire as we grow. Applicants welcome!',
    },
    {
      question: 'How much is BlenderBin?',
      answer: 'A BlenderBin basic subscription will be $14 a month, or $126 a year. You can cancel anytime.',
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
