const assert = require("node:assert/strict");
const crypto = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const source = fs.readFileSync(path.resolve(__dirname, "../neo-os/neo-chat-transport.js"), "utf8");
const values = new Map();
const localStorage = {
  getItem: key => values.has(key) ? values.get(key) : null,
  setItem: (key, value) => values.set(String(key), String(value)),
  removeItem: key => values.delete(String(key))
};
const window = {
  crypto: crypto.webcrypto,
  localStorage,
  addEventListener() {},
  setTimeout,
  clearTimeout
};
window.parent = window;

const context = vm.createContext({
  window,
  localStorage,
  URL,
  DOMException,
  Map,
  Set,
  Uint32Array,
  console
});
vm.runInContext(source, context, { filename: "neo-chat-transport.js" });

(async () => {
  const transport = window.NEO_CHAT_TRANSPORT;
  const accounts = window.NEO_ACCOUNT_STORE;
  assert.equal(transport.mode(), "local");

  const alice = await transport.createProfile("Alice_local", "alice local password");
  accounts.save(alice.token, alice.user, alice.transport);
  const bob = await transport.createProfile("Bob_local", "bob local password");
  accounts.save(bob.token, bob.user, bob.transport);
  assert.equal(Array.from(accounts.list(), entry => entry.user.username).join(","), "Bob_local,Alice_local");

  accounts.clearActive();
  assert.equal(accounts.active(), null);
  const savedAlice = accounts.list().find(entry => entry.user.id === alice.user.id);
  accounts.activate(savedAlice);
  assert.equal(accounts.active().user.username, "Alice_local");
  assert.equal((await transport.resume(savedAlice.token)).user.id, alice.user.id);
  assert.equal((await transport.login("Alice_local", "alice local password")).user.id, alice.user.id);
  await assert.rejects(() => transport.login("Alice_local", "wrong password"), error => error && error.code === "invalid_credentials");

  await assert.rejects(() => transport.createProfile("Alice_local", "another local password"), error => error && error.code === "username_taken");
  const room = await transport.createRoom(alice.token, bob.user.id);
  const sent = await transport.send(alice.token, "Private hello", room.room.id, "local-client-one");
  assert.equal(sent.message.userId, alice.user.id);
  const bobState = await transport.state(bob.token, false);
  assert.ok(bobState.messages.some(message => message.text === "Private hello"));

  console.log("NEO Chat local fallback preserves selectable profiles and private conversations on one device.");
})().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
