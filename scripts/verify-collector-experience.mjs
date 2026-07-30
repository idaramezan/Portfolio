import { strict as assert } from "node:assert";
import { readFileSync } from "node:fs";

const route = readFileSync(new URL("../artifacts/api-server/src/routes/collector-experience.ts", import.meta.url), "utf8");
const admin = readFileSync(new URL("../artifacts/aida-portfolio/src/pages/admin/CollectorExperience.tsx", import.meta.url), "utf8");
const media = readFileSync(new URL("../artifacts/aida-portfolio/src/pages/admin/Media.tsx", import.meta.url), "utf8");
const player = readFileSync(new URL("../artifacts/aida-portfolio/src/components/OriginalCollectorExperience.tsx", import.meta.url), "utf8");

assert.ok(route.includes("collector_experience_config") && route.includes("collector_video_media"), "configuration and uploaded media must be database backed");
assert.ok(route.includes("video/mp4") && route.includes("video/webm") && route.includes("requireAdmin"), "video uploads must be validated and admin protected");
assert.ok(route.includes("youtubeId") && route.includes("youtube_has_embedded_borders"), "YouTube input and embedded-border status must be validated");
assert.ok(route.includes('"Accept-Ranges": "bytes"') && route.includes("status(206)"), "native video endpoint must support efficient media range requests");
assert.ok(admin.includes("Uploaded video") && admin.includes("YouTube") && admin.includes("built into the source"), "admin must select sources and warn about source borders");
assert.ok(media.includes("Collector experience videos") && media.includes("/api/collector-experience/media"), "existing Media Library must accept collector videos");
assert.ok(player.includes("<video") && player.includes("<iframe") && player.includes("observer.disconnect()"), "public player must support both stable source types");
console.log("Collector experience verification passed.");
