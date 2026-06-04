import Link from "next/link";

type Props = {
  href?: string;
  className?: string;
  height?: number;
  priority?: boolean;
};

export function Logo({ href = "/", className = "", height = 28, priority }: Props) {
  const img = (
    <img
      src="/wanapush-logo.svg"
      alt="WanaPush"
      height={height}
      style={{ height, width: "auto" }}
      className="block select-none"
      draggable={false}
      {...(priority ? { fetchPriority: "high" as const } : {})}
    />
  );

  if (!href) return <span className={className}>{img}</span>;
  return (
    <Link href={href} className={`inline-flex items-center ${className}`} aria-label="WanaPush">
      {img}
    </Link>
  );
}
