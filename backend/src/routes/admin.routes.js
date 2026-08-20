const express = require('express');
const { getStats, getConfig, getLlmConfig, updateLlmConfig } = require('../controllers/admin.controller');
const { body } = require('express-validator');
const validate = require('../middlewares/validate');
const { auth, authorize } = require('../middlewares/auth');

const router = express.Router();

// Khusus role admin
router.use(auth, authorize('admin'));

const llmUpdateValidation = [
  body('enabled').optional().isBoolean().withMessage('enabled harus boolean'),
  body('providerOrder').optional({ values: 'falsy' }).isString().withMessage('providerOrder harus string'),
  body('openai_model').optional({ values: 'falsy' }).isString(),
  body('gemini_model').optional({ values: 'falsy' }).isString(),
  body('deepseek_model').optional({ values: 'falsy' }).isString(),
  body('openai_api_key').optional({ values: 'falsy' }).isString(),
  body('gemini_api_key').optional({ values: 'falsy' }).isString(),
  body('deepseek_api_key').optional({ values: 'falsy' }).isString()
];

router.get('/stats', getStats);
router.get('/config', getConfig);
router.get('/llm-config', getLlmConfig);
router.post('/llm-config', llmUpdateValidation, validate, updateLlmConfig);

module.exports = router;
