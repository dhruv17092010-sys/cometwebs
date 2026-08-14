

'use strict';

// Initialize Supabase client
const SUPABASE_URL = 'https://denubrgfbbnwqjizfzcu.supabase.co'; // Replace with your Supabase project URL
const SUPABASE_ANON_KEY = 'sb_publishable_SPPfXqFFydR4CBjJy-Grmw_Auhg3DRx'; // Replace with your Supabase anon key

const _supabase = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Auth state management
let currentUser = null;
let currentSession = null;

// Check if user is logged in on page load
async function checkAuth() {
  const { data: { session } } = await _supabase.auth.getSession();
  currentSession = session;
  currentUser = session?.user || null;
  return currentUser;
}

// Sign up function
async function signUp(email, password) {
  try {
    const { data, error } = await _supabase.auth.signUp({
      email,
      password,
    });
    
    if (error) throw error;
    return { success: true, data };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

// Sign in function
async function signIn(email, password) {
  try {
    const { data, error } = await _supabase.auth.signInWithPassword({
      email,
      password,
    });
    
    if (error) throw error;
    currentSession = data.session;
    currentUser = data.user;
    return { success: true, data };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

// Sign out function
async function signOut() {
  try {
    const { error } = await _supabase.auth.signOut();
    if (error) throw error;
    currentUser = null;
    currentSession = null;
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

// Check if user is admin
async function checkIfAdmin(userId) {
  const { data, error } = await _supabase
    .from('admins')
    .select('id')
    .eq('user_id', userId)
    .single();
  
  if (error || !data) {
    return false;
  }
  return true;
}

// Submit client request
async function submitClientRequest(clientData) {
  try {
    const { data, error } = await _supabase
      .from('client_requests')
      .insert([{
        user_id: currentUser.id,
        email: currentUser.email,
        mobile_number: clientData.mobileNumber,
        business_name: clientData.businessName,
        business_type: clientData.businessType,
        status: 'pending',
        created_at: new Date().toISOString()
      }]);
    
    if (error) throw error;
    return { success: true, data };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

// Get all client requests (admin only)
async function getAllClientRequests() {
  try {
    const { data, error } = await _supabase
      .from('client_requests')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    return { success: true, data };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

// Get current user's client request
async function getCurrentUserRequest() {
  if (!currentUser) return null;
  
  try {
    const { data, error } = await _supabase
      .from('client_requests')
      .select('*')
      .eq('user_id', currentUser.id)
      .single();
    
    if (error && error.code !== 'PGRST116') throw error;
    return data;
  } catch (error) {
    console.error('Error fetching user request:', error);
    return null;
  }
}

// Protect route - redirect if not authenticated
async function requireAuth(redirectUrl = '/login.html') {
  await checkAuth();
  if (!currentUser) {
    window.location.href = redirectUrl;
    return false;
  }
  return true;
}

// Protect admin route - redirect if not admin
async function requireAdmin(redirectUrl = '/index.html') {
  await checkAuth();
  if (!currentUser) {
    window.location.href = '/login.html';
    return false;
  }
  
  const isAdmin = await checkIfAdmin(currentUser.id);
  if (!isAdmin) {
    window.location.href = redirectUrl;
    return false;
  }
  return true;
}

// Redirect if already logged in
async function redirectIfLoggedIn(redirectUrl = '/client.html') {
  await checkAuth();
  if (currentUser) {
    window.location.href = redirectUrl;
    return true;
  }
  return false;
}

// Listen for auth state changes
_supabase.auth.onAuthStateChange((event, session) => {
  currentSession = session;
  currentUser = session?.user || null;
  
  // Handle different auth events
  switch (event) {
    case 'SIGNED_IN':
      console.log('User signed in');
      break;
    case 'SIGNED_OUT':
      console.log('User signed out');
      break;
    case 'TOKEN_REFRESHED':
      console.log('Token refreshed');
      break;
    case 'USER_UPDATED':
      console.log('User updated');
      break;
  }
});

// Export functions for use in other scripts
window.CometAuth = {
  supabase: _supabase,
  checkAuth,
  signUp,
  signIn,
  signOut,
  checkIfAdmin,
  submitClientRequest,
  getAllClientRequests,
  getCurrentUserRequest,
  requireAuth,
  requireAdmin,
  redirectIfLoggedIn,
  getCurrentUser: () => currentUser,
  getSession: () => currentSession
};
