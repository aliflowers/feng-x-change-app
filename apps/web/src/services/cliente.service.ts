import { supabase } from '@/lib/supabase/client';

export interface GetClientsParams {
 currentPage: number;
 itemsPerPage: number;
 searchQuery: string;
 kycFilter: string;
 countryFilter: string;
}

export const clienteService = {
 /**
  * Obtiene la lista paginada y filtrada de clientes con rol 'CLIENT'
  */
 async getClients({
  currentPage,
  itemsPerPage,
  searchQuery,
  kycFilter,
  countryFilter,
 }: GetClientsParams) {
  let query = supabase
   .from('profiles')
   .select(`
        id,
        first_name,
        last_name,
        email,
        phone_number,
        country,
        nationality,
        document_type,
        document_number,
        role,
        is_kyc_verified,
        created_at,
        updated_at,
        avatar_url
      `, { count: 'exact' })
   .eq('role', 'CLIENT');

  if (kycFilter === 'verified') {
   query = query.eq('is_kyc_verified', true);
  } else if (kycFilter === 'pending') {
   query = query.eq('is_kyc_verified', false);
  }

  if (countryFilter) {
   query = query.eq('country', countryFilter);
  }

  const from = (currentPage - 1) * itemsPerPage;
  const to = from + itemsPerPage - 1;

  query = query
   .order('created_at', { ascending: false })
   .range(from, to);

  const { data, count, error } = await query;

  if (error) throw error;

  let clientsList = data || [];

  // Client-side search filter
  if (searchQuery.trim()) {
   const search = searchQuery.toLowerCase();
   clientsList = clientsList.filter(c =>
    c.first_name?.toLowerCase().includes(search) ||
    c.last_name?.toLowerCase().includes(search) ||
    c.email?.toLowerCase().includes(search) ||
    c.document_number?.toLowerCase().includes(search) ||
    c.phone_number?.toLowerCase().includes(search)
   );
  }

  return { clients: clientsList, count: count || 0 };
 },

 /**
  * Obtiene una URL firmada para un avatar de cliente
  */
 async getSignedAvatarUrl(avatarPath: string): Promise<string | null> {
  if (avatarPath.startsWith('http')) return avatarPath;

  try {
   const { data, error } = await supabase.storage
    .from('kyc')
    .createSignedUrl(avatarPath, 3600);

   if (!error && data) {
    return data.signedUrl;
   }
  } catch (err) {
   console.error('Error fetching signed avatar:', err);
  }
  return null;
 },

 /**
  * Obtiene las transacciones recientes asociadas a un cliente
  */
 async getClientTransactions(clientId: string) {
  const { data, error } = await supabase
   .from('transactions')
   .select(`
        id,
        transaction_number,
        amount_sent,
        amount_received,
        exchange_rate_applied,
        status,
        created_at,
        paid_at,
        payment_reference,
        from_currency:currencies!transactions_from_currency_id_fkey(code, symbol, name),
        to_currency:currencies!transactions_to_currency_id_fkey(code, symbol, name),
        user_bank_account:user_bank_accounts!transactions_user_bank_account_id_fkey(
          account_holder,
          account_number,
          bank_platform:banks_platforms(name, type)
        )
      `)
   .eq('user_id', clientId)
   .order('created_at', { ascending: false })
   .limit(20);

  if (error) throw error;

  return (data || []).map(t => {
   const userBankAccount = Array.isArray(t.user_bank_account) ? t.user_bank_account[0] : t.user_bank_account;
   return {
    ...t,
    from_currency: Array.isArray(t.from_currency) ? t.from_currency[0] : t.from_currency,
    to_currency: Array.isArray(t.to_currency) ? t.to_currency[0] : t.to_currency,
    user_bank_account: userBankAccount ? {
     ...userBankAccount,
     bank_platform: Array.isArray(userBankAccount.bank_platform) ? userBankAccount.bank_platform[0] : userBankAccount.bank_platform
    } : null
   };
  });
 },

 /**
  * Obtiene los beneficiarios activos de un cliente
  */
 async getClientBeneficiaries(clientId: string) {
  const { data, error } = await supabase
   .from('user_bank_accounts')
   .select(`
        id,
        account_holder,
        account_number,
        document_type,
        document_number,
        is_active,
        created_at,
        bank:banks(id, name, type, currency_code),
        bank_platform:banks_platforms(id, name, type)
      `)
   .eq('user_id', clientId)
   .order('created_at', { ascending: false });

  if (error) {
   console.error('Supabase error details:', {
    message: error.message,
    details: error.details,
    hint: error.hint,
    code: error.code
   });
   throw error;
  }

  const activeBeneficiaries = (data || []).filter(b => b.is_active !== false);

  return activeBeneficiaries.map(b => ({
   ...b,
   bank: Array.isArray(b.bank) ? b.bank[0] : b.bank,
   bank_platform: Array.isArray(b.bank_platform) ? b.bank_platform[0] : b.bank_platform,
  }));
 }
};
