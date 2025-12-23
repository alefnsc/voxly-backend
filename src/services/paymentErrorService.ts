/**
 * Unified Payment Error Handling
 * 
 * Provides consistent error types and messages across all payment providers
 * (MercadoPago, PayPal, Stripe). Each provider's native errors are mapped
 * to standardized PaymentError instances for consistent frontend handling.
 */

import { paymentLogger } from '../utils/logger';

/**
 * Payment error codes - consistent across all providers
 */
export enum PaymentErrorCode {
  // Authentication/Configuration errors
  INVALID_CREDENTIALS = 'INVALID_CREDENTIALS',
  PROVIDER_NOT_CONFIGURED = 'PROVIDER_NOT_CONFIGURED',
  PROVIDER_UNAVAILABLE = 'PROVIDER_UNAVAILABLE',
  
  // User-facing payment errors
  PAYMENT_DECLINED = 'PAYMENT_DECLINED',
  INSUFFICIENT_FUNDS = 'INSUFFICIENT_FUNDS',
  CARD_EXPIRED = 'CARD_EXPIRED',
  INVALID_CARD = 'INVALID_CARD',
  CVV_INVALID = 'CVV_INVALID',
  
  // Transaction errors
  DUPLICATE_PAYMENT = 'DUPLICATE_PAYMENT',
  PAYMENT_NOT_FOUND = 'PAYMENT_NOT_FOUND',
  PAYMENT_ALREADY_PROCESSED = 'PAYMENT_ALREADY_PROCESSED',
  
  // Rate limiting / Abuse
  TOO_MANY_REQUESTS = 'TOO_MANY_REQUESTS',
  FRAUD_DETECTED = 'FRAUD_DETECTED',
  
  // Webhook errors
  INVALID_WEBHOOK_SIGNATURE = 'INVALID_WEBHOOK_SIGNATURE',
  WEBHOOK_PROCESSING_FAILED = 'WEBHOOK_PROCESSING_FAILED',
  
  // General errors
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  NETWORK_ERROR = 'NETWORK_ERROR',
  TIMEOUT = 'TIMEOUT',
  UNKNOWN_ERROR = 'UNKNOWN_ERROR',
}

/**
 * User-friendly error messages for each error code
 */
export const ERROR_MESSAGES: Record<PaymentErrorCode, { en: string; pt: string; es: string }> = {
  [PaymentErrorCode.INVALID_CREDENTIALS]: {
    en: 'Payment service configuration error. Please contact support.',
    pt: 'Erro de configuração do serviço de pagamento. Entre em contato com o suporte.',
    es: 'Error de configuración del servicio de pago. Contacte con soporte.',
  },
  [PaymentErrorCode.PROVIDER_NOT_CONFIGURED]: {
    en: 'Payment provider is not available in your region.',
    pt: 'Provedor de pagamento não disponível na sua região.',
    es: 'Proveedor de pago no disponible en su región.',
  },
  [PaymentErrorCode.PROVIDER_UNAVAILABLE]: {
    en: 'Payment service is temporarily unavailable. Please try again later.',
    pt: 'Serviço de pagamento temporariamente indisponível. Tente novamente mais tarde.',
    es: 'Servicio de pago temporalmente no disponible. Intente más tarde.',
  },
  [PaymentErrorCode.PAYMENT_DECLINED]: {
    en: 'Your payment was declined. Please try a different payment method.',
    pt: 'Seu pagamento foi recusado. Tente outro método de pagamento.',
    es: 'Su pago fue rechazado. Intente con otro método de pago.',
  },
  [PaymentErrorCode.INSUFFICIENT_FUNDS]: {
    en: 'Insufficient funds. Please try a different card or payment method.',
    pt: 'Saldo insuficiente. Tente outro cartão ou método de pagamento.',
    es: 'Fondos insuficientes. Intente con otra tarjeta o método de pago.',
  },
  [PaymentErrorCode.CARD_EXPIRED]: {
    en: 'Your card has expired. Please use a different card.',
    pt: 'Seu cartão expirou. Use outro cartão.',
    es: 'Su tarjeta ha expirado. Use otra tarjeta.',
  },
  [PaymentErrorCode.INVALID_CARD]: {
    en: 'Invalid card number. Please check and try again.',
    pt: 'Número de cartão inválido. Verifique e tente novamente.',
    es: 'Número de tarjeta inválido. Verifique e intente de nuevo.',
  },
  [PaymentErrorCode.CVV_INVALID]: {
    en: 'Invalid security code (CVV). Please check and try again.',
    pt: 'Código de segurança (CVV) inválido. Verifique e tente novamente.',
    es: 'Código de seguridad (CVV) inválido. Verifique e intente de nuevo.',
  },
  [PaymentErrorCode.DUPLICATE_PAYMENT]: {
    en: 'This payment was already processed.',
    pt: 'Este pagamento já foi processado.',
    es: 'Este pago ya fue procesado.',
  },
  [PaymentErrorCode.PAYMENT_NOT_FOUND]: {
    en: 'Payment not found.',
    pt: 'Pagamento não encontrado.',
    es: 'Pago no encontrado.',
  },
  [PaymentErrorCode.PAYMENT_ALREADY_PROCESSED]: {
    en: 'This payment has already been processed.',
    pt: 'Este pagamento já foi processado.',
    es: 'Este pago ya ha sido procesado.',
  },
  [PaymentErrorCode.TOO_MANY_REQUESTS]: {
    en: 'Too many payment attempts. Please wait and try again.',
    pt: 'Muitas tentativas de pagamento. Aguarde e tente novamente.',
    es: 'Demasiados intentos de pago. Espere e intente de nuevo.',
  },
  [PaymentErrorCode.FRAUD_DETECTED]: {
    en: 'Payment blocked for security reasons. Please contact support.',
    pt: 'Pagamento bloqueado por razões de segurança. Entre em contato com o suporte.',
    es: 'Pago bloqueado por razones de seguridad. Contacte con soporte.',
  },
  [PaymentErrorCode.INVALID_WEBHOOK_SIGNATURE]: {
    en: 'Invalid payment notification.',
    pt: 'Notificação de pagamento inválida.',
    es: 'Notificación de pago inválida.',
  },
  [PaymentErrorCode.WEBHOOK_PROCESSING_FAILED]: {
    en: 'Failed to process payment notification.',
    pt: 'Falha ao processar notificação de pagamento.',
    es: 'Error al procesar notificación de pago.',
  },
  [PaymentErrorCode.VALIDATION_ERROR]: {
    en: 'Invalid payment information. Please check your details.',
    pt: 'Informações de pagamento inválidas. Verifique seus dados.',
    es: 'Información de pago inválida. Verifique sus datos.',
  },
  [PaymentErrorCode.NETWORK_ERROR]: {
    en: 'Network error. Please check your connection and try again.',
    pt: 'Erro de rede. Verifique sua conexão e tente novamente.',
    es: 'Error de red. Verifique su conexión e intente de nuevo.',
  },
  [PaymentErrorCode.TIMEOUT]: {
    en: 'Payment request timed out. Please try again.',
    pt: 'Tempo esgotado. Tente novamente.',
    es: 'Tiempo de espera agotado. Intente de nuevo.',
  },
  [PaymentErrorCode.UNKNOWN_ERROR]: {
    en: 'An unexpected error occurred. Please try again.',
    pt: 'Ocorreu um erro inesperado. Tente novamente.',
    es: 'Ocurrió un error inesperado. Intente de nuevo.',
  },
};

/**
 * Standardized payment error class
 */
export class PaymentError extends Error {
  public readonly code: PaymentErrorCode;
  public readonly provider: 'mercadopago' | 'paypal' | 'stripe' | 'unknown';
  public readonly originalError?: any;
  public readonly isRetryable: boolean;
  public readonly httpStatus: number;

  constructor(
    code: PaymentErrorCode,
    provider: 'mercadopago' | 'paypal' | 'stripe' | 'unknown' = 'unknown',
    originalError?: any
  ) {
    const message = ERROR_MESSAGES[code]?.en || 'An unknown error occurred';
    super(message);
    
    this.name = 'PaymentError';
    this.code = code;
    this.provider = provider;
    this.originalError = originalError;
    this.isRetryable = this.determineRetryable(code);
    this.httpStatus = this.determineHttpStatus(code);
    
    // Capture stack trace
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, PaymentError);
    }
  }

  private determineRetryable(code: PaymentErrorCode): boolean {
    const retryableCodes = [
      PaymentErrorCode.PROVIDER_UNAVAILABLE,
      PaymentErrorCode.NETWORK_ERROR,
      PaymentErrorCode.TIMEOUT,
      PaymentErrorCode.TOO_MANY_REQUESTS,
    ];
    return retryableCodes.includes(code);
  }

  private determineHttpStatus(code: PaymentErrorCode): number {
    switch (code) {
      case PaymentErrorCode.VALIDATION_ERROR:
      case PaymentErrorCode.INVALID_CARD:
      case PaymentErrorCode.CVV_INVALID:
        return 400;
      case PaymentErrorCode.INVALID_CREDENTIALS:
      case PaymentErrorCode.INVALID_WEBHOOK_SIGNATURE:
        return 401;
      case PaymentErrorCode.FRAUD_DETECTED:
        return 403;
      case PaymentErrorCode.PAYMENT_NOT_FOUND:
        return 404;
      case PaymentErrorCode.DUPLICATE_PAYMENT:
      case PaymentErrorCode.PAYMENT_ALREADY_PROCESSED:
        return 409;
      case PaymentErrorCode.TOO_MANY_REQUESTS:
        return 429;
      case PaymentErrorCode.PROVIDER_UNAVAILABLE:
      case PaymentErrorCode.NETWORK_ERROR:
      case PaymentErrorCode.TIMEOUT:
        return 503;
      default:
        return 500;
    }
  }

  /**
   * Get localized error message
   */
  getLocalizedMessage(language: 'en' | 'pt' | 'es' = 'en'): string {
    return ERROR_MESSAGES[this.code]?.[language] || ERROR_MESSAGES[PaymentErrorCode.UNKNOWN_ERROR][language];
  }

  /**
   * Convert to API response format
   */
  toResponse(language: 'en' | 'pt' | 'es' = 'en') {
    return {
      status: 'error',
      error: {
        code: this.code,
        message: this.getLocalizedMessage(language),
        provider: this.provider,
        isRetryable: this.isRetryable,
      },
    };
  }
}

/**
 * Map MercadoPago error to PaymentError
 */
export function mapMercadoPagoError(error: any): PaymentError {
  const errorMessage = error?.message?.toLowerCase() || '';
  const statusCode = error?.status || error?.statusCode;
  const cause = error?.cause;

  // Log the original error for debugging
  paymentLogger.debug('Mapping MercadoPago error', { error, statusCode, cause });

  // Authentication errors
  if (statusCode === 401 || errorMessage.includes('unauthorized')) {
    return new PaymentError(PaymentErrorCode.INVALID_CREDENTIALS, 'mercadopago', error);
  }

  // Card-specific errors from cause array
  if (Array.isArray(cause)) {
    for (const c of cause) {
      const code = c.code?.toLowerCase() || '';
      if (code.includes('cc_rejected_insufficient_amount')) {
        return new PaymentError(PaymentErrorCode.INSUFFICIENT_FUNDS, 'mercadopago', error);
      }
      if (code.includes('cc_rejected_bad_filled_security_code')) {
        return new PaymentError(PaymentErrorCode.CVV_INVALID, 'mercadopago', error);
      }
      if (code.includes('cc_rejected_bad_filled_card_number')) {
        return new PaymentError(PaymentErrorCode.INVALID_CARD, 'mercadopago', error);
      }
      if (code.includes('cc_rejected_card_disabled')) {
        return new PaymentError(PaymentErrorCode.CARD_EXPIRED, 'mercadopago', error);
      }
      if (code.includes('cc_rejected')) {
        return new PaymentError(PaymentErrorCode.PAYMENT_DECLINED, 'mercadopago', error);
      }
    }
  }

  // Rate limiting
  if (statusCode === 429) {
    return new PaymentError(PaymentErrorCode.TOO_MANY_REQUESTS, 'mercadopago', error);
  }

  // Server errors
  if (statusCode >= 500) {
    return new PaymentError(PaymentErrorCode.PROVIDER_UNAVAILABLE, 'mercadopago', error);
  }

  // Timeout
  if (errorMessage.includes('timeout') || errorMessage.includes('timed out')) {
    return new PaymentError(PaymentErrorCode.TIMEOUT, 'mercadopago', error);
  }

  // Network errors
  if (errorMessage.includes('network') || errorMessage.includes('econnrefused')) {
    return new PaymentError(PaymentErrorCode.NETWORK_ERROR, 'mercadopago', error);
  }

  return new PaymentError(PaymentErrorCode.UNKNOWN_ERROR, 'mercadopago', error);
}

/**
 * Map PayPal error to PaymentError
 */
export function mapPayPalError(error: any): PaymentError {
  const errorName = error?.name?.toUpperCase() || '';
  const errorDetails = error?.details || [];
  const statusCode = error?.statusCode || error?.status;

  // Log the original error for debugging
  paymentLogger.debug('Mapping PayPal error', { error, errorName, errorDetails, statusCode });

  // Authentication errors
  if (errorName === 'AUTHENTICATION_FAILURE' || statusCode === 401) {
    return new PaymentError(PaymentErrorCode.INVALID_CREDENTIALS, 'paypal', error);
  }

  // Check error details for specific issues
  for (const detail of errorDetails) {
    const issue = detail.issue?.toUpperCase() || '';
    
    if (issue.includes('INSUFFICIENT_FUNDS')) {
      return new PaymentError(PaymentErrorCode.INSUFFICIENT_FUNDS, 'paypal', error);
    }
    if (issue.includes('CARD_EXPIRED')) {
      return new PaymentError(PaymentErrorCode.CARD_EXPIRED, 'paypal', error);
    }
    if (issue.includes('INSTRUMENT_DECLINED') || issue.includes('PAYER_ACTION_REQUIRED')) {
      return new PaymentError(PaymentErrorCode.PAYMENT_DECLINED, 'paypal', error);
    }
    if (issue.includes('INVALID_SECURITY_CODE') || issue.includes('CVV')) {
      return new PaymentError(PaymentErrorCode.CVV_INVALID, 'paypal', error);
    }
    if (issue.includes('DUPLICATE')) {
      return new PaymentError(PaymentErrorCode.DUPLICATE_PAYMENT, 'paypal', error);
    }
  }

  // Order not found
  if (errorName === 'RESOURCE_NOT_FOUND') {
    return new PaymentError(PaymentErrorCode.PAYMENT_NOT_FOUND, 'paypal', error);
  }

  // Rate limiting
  if (statusCode === 429) {
    return new PaymentError(PaymentErrorCode.TOO_MANY_REQUESTS, 'paypal', error);
  }

  // Server errors
  if (statusCode >= 500) {
    return new PaymentError(PaymentErrorCode.PROVIDER_UNAVAILABLE, 'paypal', error);
  }

  // Validation errors
  if (errorName === 'INVALID_REQUEST' || statusCode === 400) {
    return new PaymentError(PaymentErrorCode.VALIDATION_ERROR, 'paypal', error);
  }

  return new PaymentError(PaymentErrorCode.UNKNOWN_ERROR, 'paypal', error);
}

/**
 * Wrap async payment functions with error handling
 */
export function withPaymentErrorHandling<T>(
  provider: 'mercadopago' | 'paypal' | 'stripe',
  fn: () => Promise<T>
): Promise<T> {
  return fn().catch((error) => {
    if (error instanceof PaymentError) {
      throw error;
    }

    const mapper = provider === 'mercadopago' ? mapMercadoPagoError : mapPayPalError;
    throw mapper(error);
  });
}

export default PaymentError;
