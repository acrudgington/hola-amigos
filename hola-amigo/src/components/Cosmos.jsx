import { memo } from "react";

// Quiet dot-grid canvas behind everything (styled in .cosmos). No glows, no blobs.
export const Cosmos = memo(function Cosmos() {
  return <div className="cosmos" aria-hidden="true" />;
});
