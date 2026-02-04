/**
 * WhatsApp Module - Índice de exportaciones
 * 
 * Sistema de chatbot determinista para WhatsApp Business API
 */

// Session Management
export {
 getOrCreateSession,
 updateSession,
 transitionTo,
 goBack,
 resetSession,
 getSessionById,
 cleanupInactiveSessions,
} from './session-manager';

// Message Building
export {
 sendTextMessage,
 sendImageMessage,
 sendListMessage,
 sendButtonMessage,
 sendWelcomeUnregistered,
 sendMainMenu,
 sendCurrencySelector,
 sendConfirmation,
 sendCompanyAccount,
 sendProofRequest,
 sendOperationCreated,
} from './message-builder';

// OCR Service
export {
 processPaymentProof,
 processWhatsAppMedia,
 type OCRResult,
} from './ocr-service';

// Navigation Utilities
export {
 checkSessionTimeout,
 cleanupExpiredSessions,
 sendErrorMessage,
 sendInvalidInputMessage,
 sendSessionExpiredMessage,
 detectTextCommand,
 sendHelpMessage,
 parseAmount,
} from './navigation-utils';

// Handlers (Dispatcher)
export { dispatchMessage, type IncomingMessage } from './handlers';
