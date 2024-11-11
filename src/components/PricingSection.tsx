import React from 'react';
import { motion } from 'framer-motion';
import { Check, MessageSquare } from 'lucide-react';
import { Button } from './ui/Button';

const plans = [
  {
    name: 'Monthly',
    price: '$19',
    period: '/month',
    description: 'Perfect for individual users',
    features: [
      'Unlimited reading sessions',
      'Basic analytics',
      'PDF & EPUB support',
      'Mobile app access',
      'Email support',
    ],
    buttonText: 'Start Monthly Plan',
    highlighted: false,
  },
  {
    name: 'Lifetime',
    price: '$249',
    period: 'one-time',
    description: 'Best value for long-term users',
    features: [
      'Everything in Monthly',
      'Advanced analytics',
      'Priority support',
      'Team sharing features',
      'API access',
      'Custom integrations',
    ],
    buttonText: 'Get Lifetime Access',
    highlighted: true,
  },
  {
    name: 'Enterprise',
    price: 'Custom',
    period: '',
    description: 'For teams and organizations',
    features: [
      'Everything in Lifetime',
      'Custom deployment',
      'Dedicated support',
      'Team training',
      'SLA guarantee',
      'Custom features',
    ],
    buttonText: 'Contact Sales',
    highlighted: false,
  },
];

export function PricingSection() {
  return (
    <section className="py-20">
      <div className="container mx-auto px-4">
        <div className="max-w-3xl mx-auto text-center mb-16">
          <h2 className="text-3xl font-bold text-gray-900 mb-4">
            Simple, Transparent Pricing
          </h2>
          <p className="text-lg text-gray-600">
            Choose the plan that best fits your needs
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto">
          {plans.map((plan, index) => (
            <motion.div
              key={plan.name}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              className="relative"
            >
              {plan.highlighted && (
                <div className="absolute -top-4 left-0 right-0 text-center">
                  <span className="bg-blue-600 text-white px-4 py-1 rounded-full text-sm font-medium">
                    Most Popular
                  </span>
                </div>
              )}

              <div className={`h-full bg-white rounded-xl shadow-lg p-8 ${
                plan.highlighted ? 'ring-2 ring-blue-600' : ''
              }`}>
                <h3 className="text-2xl font-bold text-gray-900 mb-2">
                  {plan.name}
                </h3>
                <div className="flex items-baseline mb-4">
                  <span className="text-4xl font-bold text-gray-900">{plan.price}</span>
                  {plan.period && (
                    <span className="text-gray-600 ml-1">{plan.period}</span>
                  )}
                </div>
                <p className="text-gray-600 mb-6">{plan.description}</p>

                <ul className="space-y-4 mb-8">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex items-start gap-3">
                      <Check className="h-5 w-5 text-blue-600 mt-0.5" />
                      <span className="text-gray-600">{feature}</span>
                    </li>
                  ))}
                </ul>

                <Button
                  variant={plan.highlighted ? 'primary' : 'secondary'}
                  className="w-full"
                >
                  {plan.name === 'Enterprise' ? (
                    <div className="flex items-center justify-center gap-2">
                      <MessageSquare className="h-4 w-4" />
                      {plan.buttonText}
                    </div>
                  ) : (
                    plan.buttonText
                  )}
                </Button>
              </div>
            </motion.div>
          ))}
        </div>

        <div className="mt-16 max-w-3xl mx-auto text-center">
          <p className="text-gray-600">
            All plans include a 14-day money-back guarantee. No questions asked.
          </p>
        </div>
      </div>
    </section>
  );
}