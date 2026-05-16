import fetch from 'node-fetch';
import { HttpsProxyAgent } from 'https-proxy-agent';

const agent = new HttpsProxyAgent(process.env.FIXIE_URL);

export default async function handler(req, res) {

  try {

    const reference = req.query.reference;

    const response = await fetch(
      'https://tripay.co.id/api/transaction/detail?reference=' + reference,
      {
        method: 'GET',

        headers: {
          Authorization:
            `Bearer ${process.env.TRIPAY_API_KEY}`
        },

        agent
      }
    );

    const result = await response.json();

    console.log(result);

    if (!result.success) {

      return res.status(400).json({
        success: false,
        error: result.message
      });

    }

    return res.status(200).json({

      success: true,

      paid:
        result.data.status === 'PAID'

    });

  } catch (error) {

    console.log(error);

    return res.status(500).json({
      success: false,
      error: error.message
    });

  }

}