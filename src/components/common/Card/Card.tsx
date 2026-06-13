import { forwardRef, type HTMLAttributes, type ReactNode } from "react";
import "./Card.css";

type Variant = "elevation" | "outlined";

export type CardProps = HTMLAttributes<HTMLDivElement> & {
  variant?: Variant;
  clickable?: boolean;
};

export type CardHeaderProps = HTMLAttributes<HTMLDivElement> & {
  avatar?: ReactNode;
  title?: ReactNode;
  subheader?: ReactNode;
  action?: ReactNode;
};

export type CardContentProps = HTMLAttributes<HTMLDivElement>;

export type CardActionsProps = HTMLAttributes<HTMLDivElement> & {
  alignRight?: boolean;
};

export type CardMediaProps = HTMLAttributes<HTMLDivElement> & {
  component?: "img" | "div";
  image?: string;
  alt?: string;
  height?: number | string;
};

const VARIANT_CLASS: Record<Variant, string> = {
  elevation: "mui-card-elevation",
  outlined: "mui-card-outlined",
};

const Card = forwardRef<HTMLDivElement, CardProps>(function Card(
  { variant = "elevation", clickable, className = "", children, ...rest },
  ref,
) {
  return (
    <div
      ref={ref}
      className={[
        "mui-card",
        VARIANT_CLASS[variant],
        clickable ? "mui-card-clickable" : "",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
      tabIndex={clickable ? 0 : undefined}
      role={clickable ? "button" : undefined}
      {...rest}
    >
      {children}
    </div>
  );
});

const CardHeader = forwardRef<HTMLDivElement, CardHeaderProps>(
  function CardHeader(
    { avatar, title, subheader, action, className = "", children, ...rest },
    ref,
  ) {
    return (
      <div
        ref={ref}
        className={["mui-card-header", className].filter(Boolean).join(" ")}
        {...rest}
      >
        {avatar && <div className="mui-card-header-avatar">{avatar}</div>}
        <div className="mui-card-header-content">
          {title && <p className="mui-card-header-title">{title}</p>}
          {subheader && (
            <p className="mui-card-header-subheader">{subheader}</p>
          )}
          {children}
        </div>
        {action && <div className="mui-card-header-action">{action}</div>}
      </div>
    );
  },
);

const CardContent = forwardRef<HTMLDivElement, CardContentProps>(
  function CardContent({ className = "", children, ...rest }, ref) {
    return (
      <div
        ref={ref}
        className={["mui-card-content", className].filter(Boolean).join(" ")}
        {...rest}
      >
        {children}
      </div>
    );
  },
);

const CardActions = forwardRef<HTMLDivElement, CardActionsProps>(
  function CardActions(
    { alignRight, className = "", children, ...rest },
    ref,
  ) {
    return (
      <div
        ref={ref}
        className={[
          "mui-card-actions",
          alignRight ? "mui-card-actions-right" : "",
          className,
        ]
          .filter(Boolean)
          .join(" ")}
        {...rest}
      >
        {children}
      </div>
    );
  },
);

const CardMedia = forwardRef<HTMLElement, CardMediaProps>(function CardMedia(
  { component = "div", image, alt, height, className = "", style, ...rest },
  ref,
) {
  const sharedClass = ["mui-card-media", className].filter(Boolean).join(" ");

  if (component === "img") {
    return (
      <img
        ref={ref as React.Ref<HTMLImageElement>}
        className={sharedClass}
        src={image}
        alt={alt ?? ""}
        style={{ height, ...style }}
        {...(rest as HTMLAttributes<HTMLImageElement>)}
      />
    );
  }

  return (
    <div
      ref={ref as React.Ref<HTMLDivElement>}
      className={sharedClass}
      role="img"
      aria-label={alt}
      style={{
        backgroundImage: image ? `url(${image})` : undefined,
        height,
        ...style,
      }}
      {...rest}
    />
  );
});

export default Card;
export { CardHeader, CardContent, CardActions, CardMedia };
