import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from './Button';

interface ConfirmDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
}

export function ConfirmDialog({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
}: ConfirmDialogProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 flex items-center justify-center z-[100] px-4 py-6 sm:p-0">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm"
            onClick={onClose}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            className="relative w-full max-w-md transform overflow-hidden rounded-xl bg-white shadow-2xl transition-all z-[101] p-6 mx-auto"
          >
            <h2 className="text-xl font-semibold text-gray-900 mb-3">{title}</h2>
            <p className="text-gray-600 mb-6">{message}</p>
            
            <div className="flex justify-end gap-3">
              <Button 
                variant="ghost" 
                onClick={onClose}
                className="hover:bg-gray-100"
              >
                Cancel
              </Button>
              <Button 
                variant="primary" 
                onClick={onConfirm}
                className="bg-red-600 hover:bg-red-700"
              >
                Delete
              </Button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}