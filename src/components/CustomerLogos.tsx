import React from 'react';
import { Building2 } from 'lucide-react';

const companies = [
  { name: 'TechCorp', users: '5,000+' },
  { name: 'EduLearn', users: '10,000+' },
  { name: 'ResearchLab', users: '3,000+' },
  { name: 'GlobalRead', users: '7,000+' },
];

export function CustomerLogos() {
  return (
    <div className="py-12 bg-white/50">
      <div className="container mx-auto px-4">
        <p className="text-center text-gray-600 mb-8 text-lg">
          Trusted by <span className="text-blue-600 font-semibold">50,000+</span> customers worldwide
        </p>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
          {companies.map((company) => (
            <div
              key={company.name}
              className="flex flex-col items-center justify-center p-6 bg-white rounded-xl shadow-lg hover:shadow-xl transition-shadow duration-300"
            >
              <Building2 className="h-8 w-8 text-blue-600 mb-2" />
              <h3 className="font-semibold text-gray-900">{company.name}</h3>
              <p className="text-sm text-gray-500">{company.users} users</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}