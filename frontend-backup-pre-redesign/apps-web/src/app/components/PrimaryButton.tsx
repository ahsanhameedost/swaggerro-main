import { Button } from '@heroui/react'
import Link from 'next/link';

export default function PrimaryButton({ href = "#", className = "", text }: { href?: string, className?: string, text: string }) {
    const ctaClass = [
        "btn-primary",
        "font-semibold",
        "shadow-sm text-[16px] leading-[1.5]",
        "hover:brightness-105 active:brightness-95",
    ].join(" ");

    return (
        <div><Button
            as={Link}
            href={href}
            radius="full"
            className={[ctaClass, className].join(" ")}
        >
            {text}
        </Button></div>
    )
}
