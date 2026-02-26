import { onRequestPost } from "./send-notifications.js";

export async function onRequest(context) {
  // For the test endpoint, we just reuse the logic or mock a simple success
  // Usually it sends a notification to a specific test token or just verifies connectivity
  // Here we'll just proxy to the main one but it's often used for simple reachability check
  return onRequestPost(context);
}
