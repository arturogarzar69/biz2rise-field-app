const contactSelectFields = `
  id,
  company_id,
  client_id,
  branch_id,
  full_name,
  phone,
  email,
  role,
  notes,
  is_primary,
  created_at
`;

function normalizeContactRecord(contactRecord) {
  if (!contactRecord) {
    return null;
  }

  return {
    id: contactRecord.id,
    company_id: contactRecord.company_id,
    client_id: contactRecord.client_id,
    branch_id: contactRecord.branch_id || null,
    full_name: contactRecord.full_name?.trim() || "",
    phone: contactRecord.phone || "",
    email: contactRecord.email || "",
    role: contactRecord.role || "",
    notes: contactRecord.notes || "",
    is_primary: Boolean(contactRecord.is_primary),
    created_at: contactRecord.created_at || null
  };
}

function buildContactPayload(contactState, companyId, defaults = {}) {
  return {
    company_id: companyId,
    client_id: contactState.clientId || defaults.clientId || null,
    branch_id: contactState.branchId || defaults.branchId || null,
    full_name: (contactState.fullName || "").trim(),
    phone: (contactState.phone || "").trim() || null,
    email: (contactState.email || "").trim() || null,
    role: (contactState.role || "").trim() || null,
    notes: (contactState.notes || "").trim() || null,
    is_primary: Boolean(contactState.isPrimary)
  };
}

// Contacts will become the future source of truth for client and branch contacts.
// Existing text fields such as clients.main_contact and branches.contact remain
// as temporary compatibility fields while the UI migrates gradually.
export async function fetchContactsForClient(supabase, clientId, companyId) {
  if (!supabase || !clientId || !companyId) {
    return [];
  }

  const { data, error } = await supabase
    .from("contacts")
    .select(contactSelectFields)
    .eq("company_id", companyId)
    .eq("client_id", clientId)
    .order("is_primary", { ascending: false })
    .order("full_name", { ascending: true });

  if (error) {
    throw error;
  }

  return (data || []).map(normalizeContactRecord);
}

export async function fetchContactsForBranch(supabase, branchId, companyId) {
  if (!supabase || !branchId || !companyId) {
    return [];
  }

  const { data, error } = await supabase
    .from("contacts")
    .select(contactSelectFields)
    .eq("company_id", companyId)
    .eq("branch_id", branchId)
    .order("is_primary", { ascending: false })
    .order("full_name", { ascending: true });

  if (error) {
    throw error;
  }

  return (data || []).map(normalizeContactRecord);
}

export async function saveContactRecord({
  supabase,
  companyId,
  contactState,
  defaults = {}
}) {
  if (!supabase) {
    throw new Error("Supabase client is required.");
  }

  if (!companyId) {
    throw new Error("companyId is required.");
  }

  const payload = buildContactPayload(contactState, companyId, defaults);

  if (!payload.client_id) {
    throw new Error("clientId is required.");
  }

  if (!payload.full_name) {
    throw new Error("fullName is required.");
  }

  const { data, error } = await supabase
    .from("contacts")
    .insert(payload)
    .select(contactSelectFields)
    .single();

  if (error) {
    throw error;
  }

  return normalizeContactRecord(data);
}

export async function updateContactRecord({
  supabase,
  companyId,
  contactId,
  contactState,
  defaults = {}
}) {
  if (!supabase) {
    throw new Error("Supabase client is required.");
  }

  if (!companyId) {
    throw new Error("companyId is required.");
  }

  if (!contactId) {
    throw new Error("contactId is required.");
  }

  const payload = buildContactPayload(contactState, companyId, defaults);

  if (!payload.client_id) {
    throw new Error("clientId is required.");
  }

  if (!payload.full_name) {
    throw new Error("fullName is required.");
  }

  const { data, error } = await supabase
    .from("contacts")
    .update(payload)
    .eq("id", contactId)
    .eq("company_id", companyId)
    .select(contactSelectFields)
    .single();

  if (error) {
    throw error;
  }

  return normalizeContactRecord(data);
}

export { buildContactPayload, normalizeContactRecord, contactSelectFields };
