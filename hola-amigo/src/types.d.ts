// Allow CSS custom properties (e.g. style={{ "--fill": colour }}) in inline styles.
import "react";
declare module "react" {
  interface CSSProperties {
    [key: `--${string}`]: string | number | undefined;
  }
}
