import { Bookmark, Users } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { cn, initials } from "@/lib/utils";

const SIZES = {
  xs: "h-7 w-7 text-[10px]",
  sm: "h-9 w-9 text-xs",
  md: "h-11 w-11 text-sm",
  lg: "h-20 w-20 text-2xl",
};

type Props = {
  name: string;
  color: string;
  size?: keyof typeof SIZES;
  online?: boolean;
  variant?: "user" | "group" | "self";
  className?: string;
};

/** Poore app me ek hi avatar (color + initials / group icon / online dot) */
export function UserAvatar({ name, color, size = "md", online, variant = "user", className }: Props) {
  return (
    <div className={cn("relative shrink-0", className)}>
      <Avatar className={SIZES[size]}>
        <AvatarFallback className="font-semibold text-white" style={{ backgroundColor: color }}>
          {variant === "group" ? (
            <Users className={size === "lg" ? "h-8 w-8" : "h-[45%] w-[45%]"} />
          ) : variant === "self" ? (
            <Bookmark className={size === "lg" ? "h-8 w-8" : "h-[45%] w-[45%]"} />
          ) : (
            initials(name)
          )}
        </AvatarFallback>
      </Avatar>
      {online && (
        <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full bg-emerald-500 ring-2 ring-background" />
      )}
    </div>
  );
}
