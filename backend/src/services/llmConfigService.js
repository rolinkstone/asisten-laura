const { getSetting, setSetting } = require('./settingsService');

/**
 * Konfigurasi LLM runtime — dibaca dari tabel `settings` (DB) dengan fallback ke .env.
 * Dapat diubah dari dashboard TANPA restart (nilai di-cache di memori dan
 * disegarkan setiap kali pengaturan disimpan).
 *
 * Tidak pernah mengekspos API key via endpoint (hanya status terkonfigurasi).
 */

const PROVIDER_NAMES = ['opencode', 'gemini'];

const DEFAULT_MODELS = {
  opencode: 'x-preview-f-free',
  gemini: 'gemini-3.6-flash'
};

let state = null;

const envDefault = (key) => process.env[key] || null;

const buildStateFromEnv = () => ({
  enabled: envDefault('LLM_ENABLED') !== 'false',
  providerOrder: (envDefault('AI_PROVIDER') || 'opencode')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean),
  providers: {
    opencode: {
      apiKey: envDefault('OPENCODE_API_KEY'),
      model: envDefault('OPENCODE_MODEL') || DEFAULT_MODELS.opencode
    },
    gemini: {
      apiKey: envDefault('GEMINI_API_KEY'),
      model: envDefault('GEMINI_MODEL') || DEFAULT_MODELS.gemini
    }
  }
});

/**
 * Muat konfigurasi dari DB (override env) ke memori.
 */
const loadConfig = async () => {
  state = buildStateFromEnv();

  const enabled = await getSetting('llm_enabled');
  if (enabled !== null) state.enabled = enabled === 'true';

  const order = await getSetting('ai_provider');
  if (order) {
    state.providerOrder = order
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
  }

  for (const name of PROVIDER_NAMES) {
    const key = await getSetting(`${name}_api_key`);
    if (key !== null) state.providers[name].apiKey = key;

    const model = await getSetting(`${name}_model`);
    if (model) state.providers[name].model = model;
  }

  return state;
};

const getConfig = () => {
  if (!state) state = buildStateFromEnv();
  return state;
};

const isEnabled = () => getConfig().enabled;

const getProviderOrder = () => {
  const order = getConfig().providerOrder;
  return order.length ? order : ['opencode'];
};

const getApiKey = (name) => getConfig().providers[name]?.apiKey || null;

const getModel = (name) => getConfig().providers[name]?.model || DEFAULT_MODELS[name] || null;

const isProviderConfigured = (name) => !!getApiKey(name);

/**
 * Simpan pengaturan LLM.
 * Konvensi field API key:
 *  - field TIDAK dikirim (undefined) → jangan ubah
 *  - field '' → hapus/clear (fallback ke .env)
 *  - field non-empty → simpan
 *
 * @returns {Promise<object>} tampilan publik konfigurasi (tanpa key)
 */
const updateConfig = async ({
  enabled,
  providerOrder,
  opencode_model,
  gemini_model,
  opencode_api_key,
  gemini_api_key
} = {}) => {
  if (enabled !== undefined) await setSetting('llm_enabled', enabled ? 'true' : 'false');
  if (providerOrder !== undefined) await setSetting('ai_provider', providerOrder);

  const modelSets = [
    ['opencode_model', opencode_model],
    ['gemini_model', gemini_model]
  ];
  for (const [key, val] of modelSets) {
    if (val !== undefined && val !== null) await setSetting(key, String(val));
  }

  const keySets = [
    ['opencode_api_key', opencode_api_key],
    ['gemini_api_key', gemini_api_key]
  ];
  for (const [key, val] of keySets) {
    if (val !== undefined) {
      // '' → simpan string kosong = nonaktifkan provider (override .env);
      // non-empty → simpan; undefined → jangan ubah
      await setSetting(key, val);
    }
  }

  await loadConfig();
  return getPublicConfig();
};

/**
 * Tampilan publik (aman): tanpa API key, hanya status terkonfigurasi.
 */
const getPublicConfig = () => {
  const c = getConfig();
  return {
    enabled: c.enabled,
    providerOrder: c.providerOrder,
    models: {
      opencode: c.providers.opencode.model,
      gemini: c.providers.gemini.model
    },
    configured: {
      opencode: !!c.providers.opencode.apiKey,
      gemini: !!c.providers.gemini.apiKey
    }
  };
};

/**
 * Batas token output LLM (default 4096; ubah via LLM_MAX_TOKENS di .env).
 * 1000 token terlalu pendek dan membuat jawaban terpotong.
 */
const getMaxTokens = () => Number(process.env.LLM_MAX_TOKENS) || 4096;

module.exports = {
  loadConfig,
  getConfig,
  getPublicConfig,
  updateConfig,
  isEnabled,
  getProviderOrder,
  getApiKey,
  getModel,
  getMaxTokens,
  isProviderConfigured,
  DEFAULT_MODELS
};
