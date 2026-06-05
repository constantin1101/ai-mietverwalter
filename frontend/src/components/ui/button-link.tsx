import Link from "next/link";
import { type ComponentProps } from "react";
import { buttonVariants } from "@/components/ui/button";
import { type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

type ButtonLinkProps = ComponentProps<typeof Link> &
  VariantProps<typeof buttonVariants>;

/**
 * A Next.js Link styled as a Button.
 * Use this instead of <Button asChild><Link /></Button>
 * (the installed shadcn/ui version does not support asChild).
 */
export function ButtonLink({
  className,
  variant,
  size,
  ...props
}: ButtonLinkProps) {
  return (
    <Link
      className={cn(buttonVariants({ variant, size }), className)}
      {...props}
    />
  );
}
