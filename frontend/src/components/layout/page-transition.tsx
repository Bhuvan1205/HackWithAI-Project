"use client"

import { motion } from "framer-motion"

export function PageTransition({ children, className }: { children: React.ReactNode, className?: string }) {
 return (
  <motion.div
   initial={{ opacity: 0, y: 10 }}
   animate={{ opacity: 1, y: 0 }}
   exit={{ opacity: 0, y: -10 }}
   transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
   className={className}
  >
   {children}
  </motion.div>
 )
}
