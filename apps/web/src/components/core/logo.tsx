import { Link } from "@tanstack/react-router";
import { Hexagon } from "lucide-react";
import React from "react";

export const Logo = React.forwardRef<HTMLAnchorElement, React.ComponentProps<typeof Link>>((props, ref) => {
    return (
        <Link to="/" ref={ref} {...props} className={["flex items-center gap-2", props.className].filter(Boolean).join(" ")}>
            <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                <Hexagon className="size-5" />
            </div>
            <span className="text-xl font-bold truncate group-data-[collapsible=icon]:hidden">SSO</span>
        </Link>
    )
});

export default Logo;
