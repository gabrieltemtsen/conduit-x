import { Request, Response, NextFunction } from 'express';
import { X402MeterServer, MeterOptions } from '@conduitx/x402-hedera';

export function createMeterMiddleware(options: MeterOptions) {
  const meter = new X402MeterServer(options);

  return async (req: Request, res: Response, next: NextFunction) => {
    const paymentHeader = req.headers['x-payment'] as string | undefined;

    if (!paymentHeader) {
      const challenge = meter.createChallenge(req.body, req.query);
      res.setHeader('WWW-Authenticate', `x402-hedera realm="${options.serviceId}", recipient="${options.sellerAccountId}"`);
      return res.status(402).json(challenge);
    }

    const verification = await meter.verifyPayment(paymentHeader, req.body, req.query);
    if (!verification.valid || !verification.proof) {
      return res.status(402).json({
        error: verification.error || 'Invalid or unverified payment',
        retryChallenge: meter.createChallenge(req.body, req.query)
      });
    }

    // Attach proof & meter to request for downstream handler
    (req as any).x402Proof = verification.proof;
    (req as any).x402Meter = meter;
    (req as any).x402StartTime = Date.now();

    next();
  };
}

export * from '@conduitx/x402-hedera';
