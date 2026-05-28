import { fetchTripayTransaction } from '../lib/payment.js';

export default async function handler(req, res) {
  try {
    const reference = req.query.reference;

    if (!reference) {
      return res.status(400).json({
        success: false,
        error: 'reference wajib diisi'
      });
    }

    const result = await fetchTripayTransaction(reference);

    if (!result.success) {
      return res.status(400).json({
        success: false,
        error: result.message
      });
    }

    return res.status(200).json({
      success: true,
      paid: result.data.status === 'PAID',
      status: result.data.status
    });
  } catch (error) {
    console.error('Error check payment:', error.response?.data || error);

    return res.status(500).json({
      success: false,
      error: error.response?.data?.message || error.message
    });
  }
}
