/* TSOC Exercise v2.1.0 / Build017
   TEST storage isolation for /test/build010/
   - Production localStorage keys remain untouched.
   - Production IndexedDB databases remain untouched.
   - build009 (Build016 保全環境) の localStorage / IndexedDB とも完全分離する。
   - The test site gets its own localStorage namespace and IndexedDB databases.
*/
(() => {
  "use strict";

  const TEST_PREFIX = "tsoc_test_build010__";
  const DB_MAP = {
    "tsoc_admin_phase2_images": "tsoc_test_build010__tsoc_admin_phase2_images",
    "tsoc_visual_editor_v1": "tsoc_test_build010__tsoc_visual_editor_v1"
  };
  const EXCLUDED_LOCAL_KEYS = new Set([
    "tsoc_admin_password_hash_v1"
  ]);

  const raw = {
    getItem: Storage.prototype.getItem,
    setItem: Storage.prototype.setItem,
    removeItem: Storage.prototype.removeItem,
    key: Storage.prototype.key
  };

  function shouldScopeKey(key) {
    return typeof key === "string" &&
      key.startsWith("tsoc_") &&
      !key.startsWith(TEST_PREFIX) &&
      !EXCLUDED_LOCAL_KEYS.has(key);
  }
  function physicalKey(key) {
    return shouldScopeKey(key) ? TEST_PREFIX + key : key;
  }
  function logicalKey(key) {
    return typeof key === "string" && key.startsWith(TEST_PREFIX)
      ? key.slice(TEST_PREFIX.length)
      : key;
  }

  Storage.prototype.getItem = function(key) {
    if (this === localStorage) key = physicalKey(String(key));
    return raw.getItem.call(this, key);
  };
  Storage.prototype.setItem = function(key, value) {
    if (this === localStorage) key = physicalKey(String(key));
    return raw.setItem.call(this, key, value);
  };
  Storage.prototype.removeItem = function(key) {
    if (this === localStorage) key = physicalKey(String(key));
    return raw.removeItem.call(this, key);
  };

  const nativeOpen = indexedDB.open.bind(indexedDB);
  indexedDB.open = function(name, version) {
    const mapped = DB_MAP[name] || name;
    return version === undefined ? nativeOpen(mapped) : nativeOpen(mapped, version);
  };

  function snapshotScopedLocalStorage() {
    const out = {};
    for (let i = 0; i < localStorage.length; i++) {
      const physical = raw.key.call(localStorage, i);
      if (!physical || !physical.startsWith(TEST_PREFIX)) continue;
      const logical = logicalKey(physical);
      out[logical] = raw.getItem.call(localStorage, physical);
    }
    return out;
  }

  function clearScopedLocalStorage() {
    const remove = [];
    for (let i = 0; i < localStorage.length; i++) {
      const physical = raw.key.call(localStorage, i);
      if (physical && physical.startsWith(TEST_PREFIX)) remove.push(physical);
    }
    remove.forEach(k => raw.removeItem.call(localStorage, k));
  }

  window.TSOC_STORAGE_SCOPE = {
    mode: "test",
    id: "build010",
    prefix: TEST_PREFIX,
    dbMap: {...DB_MAP},
    physicalKey,
    logicalKey,
    snapshotScopedLocalStorage,
    clearScopedLocalStorage
  };

  console.info("[TSOC] TEST storage isolation active:", TEST_PREFIX);
})();
