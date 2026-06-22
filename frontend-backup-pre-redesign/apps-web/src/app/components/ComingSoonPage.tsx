"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { cx } from "@/lib/helpers";
import PrimaryButton from "./PrimaryButton";

export default function ComingSoonPage() {

    return (
        <main className="relative grid min-h-screen place-items-center overflow-hidden bg-white px-6">
            {/* Background: soft glow + subtle grid */}
            <div className="pointer-events-none absolute inset-0">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_35%,rgba(155, 104, 244, 0.18),rgba(255, 255, 255, 0)_58%)]" />
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_85%,rgba(0,0,0,0.08),rgba(255, 255, 255, 0)_55%)]" />
                <div className="absolute inset-0 opacity-[0.18] [background-image:linear-gradient(to_right,rgba(0,0,0,0.06)_1px,transparent_1px),linear-gradient(to_bottom,rgba(0,0,0,0.06)_1px,transparent_1px)] [background-size:48px_48px]" />
            </div>

            {/* Floating blobs */}
            <motion.div
                aria-hidden="true"
                className="pointer-events-none absolute -left-16 top-24 h-56 w-56 rounded-full blur-3xl"
                style={{ background: "rgba(131, 124, 239, 0.22)" }}
                animate={{ y: [0, 18, 0], x: [0, 10, 0] }}
                transition={{ duration: 6.5, repeat: Infinity, ease: "easeInOut" }}
            />
            <motion.div
                aria-hidden="true"
                className="pointer-events-none absolute -right-20 bottom-20 h-72 w-72 rounded-full blur-3xl"
                style={{ background: "rgba(131, 124, 239, 0.22)" }}
                animate={{ y: [0, -16, 0], x: [0, -10, 0] }}
                transition={{ duration: 7.5, repeat: Infinity, ease: "easeInOut" }}
            />

            {/* Center glow ring pulse */}
            <motion.div
                aria-hidden="true"
                className="pointer-events-none absolute left-1/2 top-1/2 h-[520px] w-[520px] -translate-x-1/2 -translate-y-1/2 rounded-full"
                style={{
                    boxShadow: "0 0 0 1px rgba(136, 141, 241, 0.14) inset",
                }}
                animate={{ scale: [0.96, 1.02, 0.96], opacity: [0.35, 0.55, 0.35] }}
                transition={{ duration: 4.8, repeat: Infinity, ease: "easeInOut" }}
            />

            {/* Content */}
            <motion.div
                className="relative text-center"
                initial={{ opacity: 0, scale: 0.78, y: 18 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                transition={{ type: "spring", stiffness: 160, damping: 18 }}
            >

                {/* Big headline */}
                <h1 className="text-balance text-[48px] font-extrabold leading-[0.98] tracking-tight text-black sm:text-[92px]">
                    <span className="relative inline-block">
                        Coming Soon
                        <span
                            className="absolute -bottom-2 left-1/2 h-4 w-[78%] -translate-x-1/2 rounded-full opacity-25"
                            style={{ background: "var(--primary)" }}
                        />
                    </span>
                </h1>

                {/* Fancy shimmer line */}
                <motion.div
                    aria-hidden="true"
                    className="mx-auto mt-6 h-[2px] w-[240px] overflow-hidden rounded-full bg-black/10"
                    initial={{ width: 0, opacity: 0 }}
                    animate={{ width: 240, opacity: 1 }}
                    transition={{ delay: 0.18, duration: 0.5, ease: "easeOut" }}
                >
                    <motion.div
                        className="h-full w-24 rounded-full"
                        style={{ background: "var(--primary-gradient)" }}
                        animate={{ x: [-120, 280] }}
                        transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut", repeatDelay: 0.3 }}
                    />
                </motion.div>

                {/* Button */}
                <motion.div
                    className="mt-10 flex justify-center"
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.22, duration: 0.35, ease: "easeOut" }}
                >
                    <PrimaryButton href="/" className="h-12 px-8" text="Back to Home" />
                </motion.div>
            </motion.div>
        </main>
    );
}