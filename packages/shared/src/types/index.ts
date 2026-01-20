/**
 * @fileoverview Exportación de todos los tipos del sistema Fengxchange
 */

// Enums
export {
 UserRole,
 TransactionStatus,
 DocumentType,
 BankPlatformType,
 MovementType,
} from './enums';

// Profile
export type {
 Profile,
 CreateClientProfileInput,
 CreateInternalUserInput,
 UpdateProfileInput,
 ProfileSummary,
} from './profile';

// Currency
export type {
 Currency,
 CreateCurrencyInput,
 UpdateCurrencyInput,
} from './currency';

// Exchange Rate
export type {
 ExchangeRate,
 ExchangeRateWithCurrencies,
 UpsertExchangeRateInput,
 ExchangeRateHistory,
} from './exchange-rate';

// Bank Platform
export type {
 BankPlatform,
 BankPlatformWithCurrency,
 CreateBankPlatformInput,
 UpdateBankPlatformInput,
 BankMovement,
 CreateBankMovementInput,
} from './bank-platform';

// Transaction
export type {
 Transaction,
 TransactionWithDetails,
 CreateTransactionInput,
 TakeTransactionInput,
 CompleteTransactionInput,
 RejectTransactionInput,
 TransactionPoolItem,
 TransactionFilters,
} from './transaction';

// User Bank Account
export type {
 UserBankAccount,
 CreateUserBankAccountInput,
 UpdateUserBankAccountInput,
} from './user-bank-account';

// Commission
export type {
 Commission,
 CommissionWithDetails,
 CommissionHistory,
 AgentCommissionSummary,
 AgentCommissionOverview,
 CommissionFilters,
} from './commission';

// Delayed Payment
export type { DelayedPayment, DelayedPaymentSummary } from './delayed-payment';
export { DELAYED_PAYMENT_CONSTANTS } from './delayed-payment';

// Profit Config
export type {
 ProfitConfig,
 UpdateProfitConfigInput,
 ProfitSimulationResult,
} from './profit-config';
