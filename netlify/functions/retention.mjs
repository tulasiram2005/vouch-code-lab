import { purgeExpired } from "../../server/db.mjs";
export default async function retention() {
  await purgeExpired();
}
export const config = { schedule: "17 3 * * *" };
