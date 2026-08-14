const Razorpay = require('razorpay');
const crypto = require('crypto');

const getKeyId = () => process.env.RAZORPAY_KEY_ID;
const getKeySecret = () => process.env.RAZORPAY_KEY_SECRET;

const isConfigured = () => Boolean(getKeyId() && getKeySecret());

const client = () =>
  new Razorpay({
    key_id: getKeyId(),
    key_secret: getKeySecret(),
  });

/**
 * Create a Razorpay order (server-authoritative amount).
 * Only the amount/currency travel here; everything else is merchant notes.
 */
const createOrder = async (req, res) => {
  if (!isConfigured()) {
    return res.status(503).json({ error: 'Razorpay not configured' });
  }
  const { amount, currency = 'INR', receipt, notes = {} } = req.body || {};
  const paise = Math.round(Number(amount));
  if (!Number.isFinite(paise) || paise <= 0 || paise > 500000) {
    return res.status(400).json({ error: 'Invalid amount' });
  }
  try {
    const order = await client().orders.create({
      amount: paise,
      currency,
      receipt: String(receipt || `agri-${Date.now()}`),
      notes: { app: 'AgriConnect', userId: req.user._id, ...notes },
    });
    return res.json({ id: order.id, amount: order.amount, currency: order.currency });
  } catch (err) {
    console.error('[razorpay] create-order error:', err.message);
    return res.status(502).json({ error: 'Could not create order' });
  }
};

/**
 * Verify a payment signature after checkout completes.
 * Never trust the client alone; validate against the key secret.
 */
const verifyPayment = async (req, res) => {
  if (!isConfigured()) {
    return res.status(503).json({ error: 'Razorpay not configured' });
  }
  const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body || {};
  if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
    return res.status(400).json({ error: 'Missing verification fields' });
  }
  const body = `${razorpay_order_id}|${razorpay_payment_id}`;
  const expected = crypto.createHmac('sha256', getKeySecret()).update(body).digest();
  const provided = Buffer.from(String(razorpay_signature), 'hex');
  if (expected.length !== provided.length || !crypto.timingSafeEqual(expected, provided)) {
    return res.status(400).json({ error: 'Invalid signature' });
  }
  return res.json({ valid: true, razorpay_payment_id });
};

module.exports = { createOrder, verifyPayment, isConfigured };
