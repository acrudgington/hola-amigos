import { memo } from "react";

// The canvas behind everything: a fine grid fading out from the top, slow and
// faint colour washes, and a touch of film grain (styled in .cosmos*).
export const Cosmos = memo(function Cosmos() {
  return <>
    <div className="cosmos" aria-hidden="true" />
    <div className="cosmos-wash" aria-hidden="true" />
    <div className="cosmos-grain" aria-hidden="true" />
  </>;
});
