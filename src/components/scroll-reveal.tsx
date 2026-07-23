/**
 * Shared scroll-reveal animation primitives (Section 0 of the homepage design
 * brief). Every major homepage section fades up + in as it enters the
 * viewport; groups of children (cards, rows) stagger in sequence rather than
 * appearing all at once.
 *
 * Usage:
 *   <ScrollReveal>...</ScrollReveal>                     — single element fade-up
 *   <ScrollRevealGroup>                                   — staggered parent
 *     <ScrollRevealItem>row 1</ScrollRevealItem>
 *     <ScrollRevealItem>row 2</ScrollRevealItem>
 *   </ScrollRevealGroup>
 */
import { motion, type Variants } from "framer-motion";
import type { ReactNode } from "react";

export const fadeUpVariants: Variants = {
  hidden: { opacity: 0, y: 24 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: "easeOut" } },
};

export function fadeUpWithDelay(delay = 0): Variants {
  return {
    hidden: { opacity: 0, y: 24 },
    show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: "easeOut", delay } },
  };
}

export const staggerContainerVariants: Variants = {
  hidden: {},
  show: {
    transition: { staggerChildren: 0.07 },
  },
};

const viewport = { once: true, margin: "-80px" } as const;

export function ScrollReveal({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <motion.div
      className={className}
      initial="hidden"
      whileInView="show"
      viewport={viewport}
      variants={fadeUpVariants}
    >
      {children}
    </motion.div>
  );
}

/** Wrap a group of ScrollRevealItem children to stagger their reveal by ~70ms. */
export function ScrollRevealGroup({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <motion.div
      className={className}
      initial="hidden"
      whileInView="show"
      viewport={viewport}
      variants={staggerContainerVariants}
    >
      {children}
    </motion.div>
  );
}

export function ScrollRevealItem({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <motion.div className={className} variants={fadeUpVariants}>
      {children}
    </motion.div>
  );
}
