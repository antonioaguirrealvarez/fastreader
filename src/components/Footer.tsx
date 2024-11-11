import React from 'react';
import { BookOpen, Github, Twitter, Linkedin } from 'lucide-react';

export function Footer() {
  return (
    <footer className="bg-gray-50 border-t border-gray-200">
      <div className="container mx-auto px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Company Info */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <BookOpen className="h-6 w-6 text-blue-600" />
              <span className="text-xl font-semibold text-gray-900">SpeedRead Pro</span>
            </div>
            <p className="text-gray-600 text-sm">
              Transforming how the world reads with AI-powered speed reading technology.
            </p>
            <div className="flex items-center gap-4">
              <a href="#" className="text-gray-400 hover:text-gray-600 transition">
                <Twitter className="h-5 w-5" />
              </a>
              <a href="#" className="text-gray-400 hover:text-gray-600 transition">
                <Github className="h-5 w-5" />
              </a>
              <a href="#" className="text-gray-400 hover:text-gray-600 transition">
                <Linkedin className="h-5 w-5" />
              </a>
            </div>
          </div>

          {/* Product */}
          <div>
            <h3 className="font-semibold text-gray-900 mb-4">Product</h3>
            <ul className="space-y-3">
              <li>
                <a href="#" className="text-gray-600 hover:text-blue-600 text-sm">Features</a>
              </li>
              <li>
                <a href="#" className="text-gray-600 hover:text-blue-600 text-sm">Pricing</a>
              </li>
              <li>
                <a href="#" className="text-gray-600 hover:text-blue-600 text-sm">Try Reader</a>
              </li>
              <li>
                <a href="#" className="text-gray-600 hover:text-blue-600 text-sm">API</a>
              </li>
            </ul>
          </div>

          {/* Resources */}
          <div>
            <h3 className="font-semibold text-gray-900 mb-4">Resources</h3>
            <ul className="space-y-3">
              <li>
                <a href="#" className="text-gray-600 hover:text-blue-600 text-sm">Documentation</a>
              </li>
              <li>
                <a href="#" className="text-gray-600 hover:text-blue-600 text-sm">Blog</a>
              </li>
              <li>
                <a href="#" className="text-gray-600 hover:text-blue-600 text-sm">Community</a>
              </li>
              <li>
                <a href="#" className="text-gray-600 hover:text-blue-600 text-sm">Support</a>
              </li>
            </ul>
          </div>

          {/* Company */}
          <div>
            <h3 className="font-semibold text-gray-900 mb-4">Company</h3>
            <ul className="space-y-3">
              <li>
                <a href="#" className="text-gray-600 hover:text-blue-600 text-sm">About Us</a>
              </li>
              <li>
                <a href="#" className="text-gray-600 hover:text-blue-600 text-sm">Careers</a>
              </li>
              <li>
                <a href="#" className="text-gray-600 hover:text-blue-600 text-sm">Contact</a>
              </li>
              <li>
                <a href="#" className="text-gray-600 hover:text-blue-600 text-sm">Press Kit</a>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-12 pt-8 border-t border-gray-200">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <p className="text-sm text-gray-600">
              © {new Date().getFullYear()} SpeedRead Pro. All rights reserved.
            </p>
            <div className="flex items-center gap-6">
              <a href="#" className="text-sm text-gray-600 hover:text-blue-600">Privacy Policy</a>
              <a href="#" className="text-sm text-gray-600 hover:text-blue-600">Terms of Service</a>
              <a href="#" className="text-sm text-gray-600 hover:text-blue-600">Cookie Policy</a>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}