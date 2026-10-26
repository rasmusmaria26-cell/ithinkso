import React from "react";
import { motion, AnimatePresence } from "framer-motion";

interface ToastProps {
  message: string | null;
  onClose?: () => void;
}

export const Toast: React.FC<ToastProps> = ({ message }) => {
  return (
    <AnimatePresence>
      {message && (
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 10 }}
          transition={{ duration: 0.18 }}
          className="fixed bottom-6 right-6 z-50 bg-paper border-2 border-ink px-4 py-3 shadow-[3px_3px_0px_#1B1A17] font-mono text-sm text-ink max-w-sm"
        >
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 bg-stamp-red inline-block" />
            <span>{message}</span>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
