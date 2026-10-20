import { Check } from "lucide-react";
import { cn } from "@/lib/utils";
import type { UserDTO } from "@/types";
import { UserAvatar } from "./user-avatar";

type Props = {
  user: UserDTO;
  online?: boolean;
  selected?: boolean;
  showCheck?: boolean;
  right?: React.ReactNode;
  onClick?: () => void;
};

/** User list ki ek row — new chat, new group, group info teeno me yahi use hota hai */
export function UserRow({ user, online, selected, showCheck, right, onClick }: Props) {
  const Comp = onClick ? "button" : "div";
  return (
    <Comp
      type={onClick ? "button" : undefined}
      onClick={onClick}
      className={cn(
        "flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left transition-colors",
        onClick && "hover:bg-accent",
        selected && "bg-accent"
      )}
    >
      <UserAvatar name={user.name} color={user.color} size="sm" online={online} />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{user.name}</p>
        <p className="truncate text-xs text-muted-foreground">{user.email}</p>
      </div>
      {right}
      {showCheck && (
        <span
          className={cn(
            "grid h-5 w-5 place-items-center rounded-full border transition-colors",
            selected ? "border-primary bg-primary text-primary-foreground" : "border-input"
          )}
        >
          {selected && <Check className="h-3 w-3" />}
        </span>
      )}
    </Comp>
  );
}
