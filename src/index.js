import { downloadAnnotations } from "./export.js";
import { ankifyLatest } from "./ankify.js";

await downloadAnnotations();
await ankifyLatest();
