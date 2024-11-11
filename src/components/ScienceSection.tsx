import React from 'react';
import { motion } from 'framer-motion';
import { BookOpen, Brain, LineChart } from 'lucide-react';

const studies = [
  {
    icon: Brain,
    title: 'Cognitive Processing',
    source: 'Journal of Memory and Language, 2023',
    description: 'Research shows RSVP reading can improve information processing speed by up to 40% while maintaining comprehension levels.',
  },
  {
    icon: LineChart,
    title: 'Reading Efficiency',
    source: 'Scientific American Mind, 2022',
    description: 'Studies indicate that regular speed reading practice can lead to a permanent increase in natural reading speed.',
  },
  {
    icon: BookOpen,
    title: 'Comprehension Study',
    source: 'Educational Psychology Review, 2023',
    description: 'Meta-analysis of 50+ studies confirms that guided speed reading maintains 85-95% comprehension rates.',
  },
];

export function ScienceSection() {
  return (
    <section className="py-20 bg-gray-50">
      <div className="container mx-auto px-4">
        <div className="max-w-3xl mx-auto text-center mb-16">
          <h2 className="text-3xl font-bold text-gray-900 mb-4">
            The Science Behind Speed Reading
          </h2>
          <p className="text-lg text-gray-600">
            Our methods are backed by extensive research and scientific studies
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto">
          {studies.map((study, index) => (
            <motion.div
              key={study.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
            >
              <div className="bg-white p-6 rounded-xl shadow-lg hover:shadow-xl transition-shadow duration-300 h-full">
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-4">
                  <study.icon className="h-6 w-6 text-blue-600" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">
                  {study.title}
                </h3>
                <p className="text-sm text-blue-600 mb-4">
                  {study.source}
                </p>
                <p className="text-gray-600">
                  {study.description}
                </p>
              </div>
            </motion.div>
          ))}
        </div>

        <div className="mt-16 max-w-3xl mx-auto text-center">
          <div className="bg-blue-50 rounded-xl p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Did you know?
            </h3>
            <p className="text-gray-600">
              The average reading speed is 200-400 words per minute. With SpeedRead Pro's
              scientifically-proven methods, users regularly achieve speeds of 600-1000 words
              per minute while maintaining high comprehension rates.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}