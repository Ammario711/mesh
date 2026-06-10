import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    background_color: "#eef1f4",
    description:
      "Local manufacturing RFQs for CAD files, 3D printing, and CNC operators.",
    display: "standalone",
    name: "Mesh",
    short_name: "Mesh",
    start_url: "/",
    theme_color: "#151719",
  };
}
