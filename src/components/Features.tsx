import React from 'react';
import { Zap, Brain, BookOpen, LineChart, Users, Lock } from 'lucide-react';
import { motion } from 'framer-motion';

const features = [
  {
    icon: Zap,
    title: 'RSVP Technology',
    description: 'Read up to 3x faster with our advanced Rapid Serial Visual Presentation technology.',
  },
  {
    icon: Brain,
    title: 'AI-Powered Analysis',
    description: 'Smart comprehension testing and personalized reading speed recommendations.',
  },
  {
    icon: BookOpen,
    title: 'Universal Format Support',
    description: 'Support for PDF, EPUB, DOC, and more. Import any text with ease.',
  },
  {
    icon: LineChart,
    title: 'Progress Tracking',
    description: 'Detailed analytics and progress tracking to monitor your improvement.',
  },
  {
    icon: Users,
    title: 'Team Collaboration',
    description: 'Share reading lists and progress with team members or study groups.',
  },
  {
    icon: Lock,
    title: 'Privacy First',
    description: 'Your reading data is encrypted and never shared with third parties.',
  },
];

export function Features() {
  return (
    <section className="py-12">
      <div className="container mx-auto px-4">
        <div className="max-w-3xl mx-auto text-center mb-12">
          <h2 className="text-3xl font-bold text-gray-900 mb-4">
            Features That Set Us Apart
          </h2>
          <p className="text-lg text-gray-600">
            Advanced tools and technologies designed to transform your reading experience
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {features.map((feature, index) => (
            <motion.div
              key={feature.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
            >
              <div className="bg-white p-6 rounded-xl shadow-lg hover:shadow-xl transition-shadow duration-300">
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-4">
                  <feature.icon className="h-6 w-6 text-blue-600" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">
                  {feature.title}
                </h3>
                <p className="text-gray-600">
                  {feature.description}
                </p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}