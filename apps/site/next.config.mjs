/** Static export so the gallery can be hosted on GitHub Pages. */
const basePath = process.env.SITE_BASE_PATH ?? "";
export default { output: "export", basePath, images: { unoptimized: true }, trailingSlash: true };
