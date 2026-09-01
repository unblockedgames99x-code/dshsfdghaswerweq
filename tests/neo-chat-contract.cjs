const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const root = path.resolve(__dirname, "..");
const read = relative => fs.readFileSync(path.join(root, relative), "utf8");

const html = read("neo-os/index.html");
const shell = read("neo-os/neo-os.js");
const transport = read("neo-os/neo-chat-transport.js");
const account = read("neo-os/neo-account-signin.js");
const chatCss = read("neo-os/neo-chat.css");
const server = read("google-script-Code.gs");
const loader = read("google-script-loader.html");
const backup = read("neo-os/neo-backup.js");
const direct = read("google-script-direct.html");
const directBuilder = read("build-google-script-direct.mjs");

new vm.Script(shell, { filename: "neo-os.js" });
new vm.Script(transport, { filename: "neo-chat-transport.js" });
new vm.Script(server, { filename: "google-script-Code.gs" });

assert.match(html, /id="neo-login-gate"[^>]+role="dialog"[^>]+aria-modal="true"/);
assert.match(html, /data-neo-login-guest>Continue as guest/);
assert.match(html, /template id="messages-template"/);
assert.match(html, /data-chat-sign-out[^>]+hidden/);
assert.match(html, /data-app="chat"[^>]+aria-label="NEO Chat"/);
assert.match(html, /neo-chat-transport\.js\?v=20260901-production-auth-v1/);
assert.match(html, /neo-chat\.css\?v=20260901-production-auth-v1/);
assert.match(html, /name="password"[^>]+autocomplete="current-password"/);
assert.match(html, /data-neo-auth-action="login"/);
assert.match(html, /data-neo-auth-action="create"/);
assert.match(html, /data-chat-attach[^>]+aria-label="Add photo, video, audio, or file"/);
assert.match(html, /data-chat-attachment-input[^>]+accept="image\/\*,video\/\*,audio\/\*/);
assert.doesNotMatch(html, /removeLegacyMessagesUi/);

assert.match(shell, /chat:\s*\{[\s\S]*?title:\s*"NEO Chat"[\s\S]*?template:\s*"messages-template"/);
assert.match(shell, /initStartScreen\(initAccountGate\);[\s\S]*?performBoot\(\);/);
assert.match(shell, /sessionStorage\.setItem\(GUEST_SESSION_KEY, "1"\)/);
assert.doesNotMatch(shell, /localStorage\.setItem\(GUEST_SESSION_KEY, "1"\)/);
assert.match(shell, /window\.NEO_CHAT_TRANSPORT\.state/);
assert.match(shell, /window\.NEO_CHAT_TRANSPORT\.search/);
assert.match(shell, /window\.NEO_CHAT_TRANSPORT\.createRoom/);
assert.match(shell, /window\.NEO_CHAT_TRANSPORT\.send/);
assert.match(shell, /window\.NEO_CHAT_TRANSPORT\.upload/);
assert.match(shell, /function selectAttachment\(file\)/);
assert.match(shell, /native-message-attachment/);
assert.match(shell, /event\.isComposing/);
assert.match(shell, /sidebar\.inert\s*=\s*conversationOpen/);
assert.match(shell, /function isCompactChat\(\)[\s\S]*?getBoundingClientRect\(\)\.width[\s\S]*?width <= 760/);
assert.match(shell, /classList\.toggle\("is-compact-layout", compact\)/);
assert.match(shell, /new ResizeObserver\(handleMessagesResize\)/);
assert.match(shell, /messagesResizeObserver\.disconnect\(\)/);
assert.match(shell, /NEO_ACCOUNT_STORE\.clearActive/);
assert.match(shell, /neo-account-picker/);
assert.match(shell, /Your message is still ready to send/);
assert.doesNotMatch(shell, /\.netlify\/functions/);
assert.doesNotMatch(shell, /placeholder\s*=\s*"iMessage"/);

assert.match(account, /instanceId\s*=\s*"neo-account-title-"/);
assert.match(account, /NEO_CHAT_TRANSPORT\.createProfile/);
assert.match(account, /NEO_CHAT_TRANSPORT\.login/);
assert.match(account, /pendingProfileRequest/);
assert.match(account, /NEO_ACCOUNT_STORE\.list/);
assert.match(account, /NEO_CHAT_TRANSPORT\.resume/);
assert.match(account, /NEO_CHAT_TRANSPORT\.signOut/);
assert.match(account, /payload\.token/);
assert.doesNotMatch(account, /static-firebase/);

assert.match(transport, /function isCloudAvailable\(\)/);
assert.match(transport, /window\.google\.script\.run/);
assert.match(transport, /LOCAL_STATE_KEY\s*=\s*"neo_chat_local_state_v2"/);
assert.match(transport, /modeLabel/);
assert.match(transport, /event\.source !== window\.parent/);
assert.match(transport, /window\.parent\.postMessage\(\{ type: "neo-chat:request"/);
assert.match(transport, /SAVED_ACCOUNTS_KEY\s*=\s*"neo_chat_saved_accounts_v1"/);
assert.doesNotMatch(transport, /firebaseio|\.netlify\/functions/);

for (const method of [
  "neoChatCreateProfile",
  "neoChatLogin",
  "neoChatResume",
  "neoChatState",
  "neoChatSearchUsers",
  "neoChatCreateRoom",
  "neoChatUploadAttachment",
  "neoChatSendMessage",
  "neoChatSignOut"
]) assert.match(server, new RegExp(`function ${method}\\(`));
assert.match(server, /Utilities\.computeDigest\(Utilities\.DigestAlgorithm\.SHA_256/);
assert.match(server, /LockService\.getScriptLock\(\)/);
assert.match(server, /NEO_CHAT_STORE_CHUNK_BYTES_\s*=\s*7000/);
assert.match(server, /function neoChatUtf8Chunks_/);
assert.match(server, /function neoChatProfileToken_/);
assert.match(server, /function neoChatPasswordHash_/);
assert.match(server, /function neoChatConstantTimeEqual_/);
assert.match(server, /NEO_CHAT_MAX_LOGIN_ATTEMPTS_/);
assert.doesNotMatch(server, /static-firebase/);

assert.match(chatCss, /--messages-blue:\s*#fff/);
assert.match(chatCss, /\.native-message\.is-own \.native-message-bubble\s*\{[^}]*background:\s*#fff/);
assert.match(chatCss, /\.messages-pinned-room\.is-global\.is-active[\s\S]*?background:\s*transparent/);
assert.match(chatCss, /\.messages-pinned-room\.is-global\.is-active \.messages-avatar\s*\{[\s\S]*?color:\s*#fff/);
assert.match(chatCss, /@media \(max-width:760px\), \(pointer:coarse\) and \(max-width:1366px\)/);
assert.match(chatCss, /\.neo-messages\.is-compact-layout\.is-conversation-open \.messages-conversation\s*\{[^}]*transform:\s*translateX\(0\)/);
assert.match(chatCss, /min-width:\s*44px/);

assert.match(loader, /event\.source !== frame\.contentWindow \|\| event\.origin !== hostedOrigin/);
assert.match(loader, /chatMethods = new Set/);
assert.match(loader, /runner\[method\]\(payload\)/);
assert.match(loader, /postMessage\(message, hostedOrigin\)/);
assert.doesNotMatch(loader, /postMessage\(message, "\*"\)/);
assert.match(backup, /"neo_chat_local_state_v2"/);
assert.match(backup, /"neo_chat_pending_profile_v1"/);
assert.match(backup, /"neo_chat_saved_accounts_v1"/);
assert.match(direct, /@main\/neo-os\/neo-chat-transport\.js\?v=20260901-production-auth-v1/);
assert.match(direct, /template id="messages-template"/);
assert.doesNotMatch(direct, /removeLegacyMessagesUi/);
assert.match(directBuilder, /const revision = "main"/);

console.log("NEO Chat startup, transport, account safety, monochrome UI, and mobile contracts passed.");
