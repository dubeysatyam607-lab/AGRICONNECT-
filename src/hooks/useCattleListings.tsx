import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { useAuditLog } from './useAuditLog';

export interface CattleListing {
  id: string;
  seller_id: string;
  type: 'Cow' | 'Buffalo' | 'Goat' | 'Poultry';
  breed: string;
  milk_yield: string | null;
  price: number;
  age: string;
  location: string;
  description: string | null;
  image_url: string | null;
  is_verified: boolean;
  is_active: boolean;
  created_at: string;
  seller_name?: string;
  // Phone removed for privacy - use secure contact flow instead
}

export const useCattleListings = () => {
  const [listings, setListings] = useState<CattleListing[]>([]);
  const [myListings, setMyListings] = useState<CattleListing[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const { logEvent } = useAuditLog();

  const fetchListings = async () => {
    setLoading(true);
    
    // Use database function to get seller name securely without exposing phone
    const { data, error } = await supabase
      .from('cattle_listings')
      .select('*')
      .eq('is_active', true)
      .order('created_at', { ascending: false });

    if (!error && data) {
      // Get seller names using the secure function
      const listingsWithNames = await Promise.all(
        data.map(async (item: any) => {
          const { data: sellerName } = await supabase
            .rpc('get_seller_display_name', { seller_user_id: item.seller_id });
          return {
            ...item,
            seller_name: sellerName || 'Seller'
          };
        })
      );
      setListings(listingsWithNames);
    }
    
    setLoading(false);
  };

  // Secure contact function using edge function
  const getSellerContact = async (listingId: string) => {
    if (!user) throw new Error('Must be logged in to contact sellers');
    
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.access_token) throw new Error('Not authenticated');

    const response = await fetch(
      `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/contact-seller`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ listingId }),
      }
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to get contact info');
    }

    return response.json();
  };

  const fetchMyListings = async () => {
    if (!user) return;
    
    const { data, error } = await supabase
      .from('cattle_listings')
      .select('*')
      .eq('seller_id', user.id)
      .order('created_at', { ascending: false });

    if (!error && data) {
      setMyListings(data as CattleListing[]);
    }
  };

  const createListing = async (listing: Omit<CattleListing, 'id' | 'seller_id' | 'is_verified' | 'is_active' | 'created_at'>) => {
    if (!user) throw new Error('Must be logged in');
    
    const { data, error } = await supabase
      .from('cattle_listings')
      .insert({
        ...listing,
        seller_id: user.id
      })
      .select()
      .single();

    if (error) throw error;
    
    // Log audit event for listing creation
    await logEvent({
      action: 'CREATE',
      tableName: 'cattle_listings',
      recordId: data.id,
      newData: listing as unknown as Record<string, unknown>,
    });
    
    return data;
  };

  const updateListing = async (id: string, updates: Partial<CattleListing>) => {
    // Get old data for audit log
    const oldListing = myListings.find(l => l.id === id);
    
    const { error } = await supabase
      .from('cattle_listings')
      .update(updates)
      .eq('id', id);

    if (error) throw error;
    
    // Log audit event for listing update
    await logEvent({
      action: 'UPDATE',
      tableName: 'cattle_listings',
      recordId: id,
      oldData: oldListing as unknown as Record<string, unknown>,
      newData: updates as unknown as Record<string, unknown>,
    });
    
    await fetchMyListings();
  };

  const deleteListing = async (id: string) => {
    // Get old data for audit log
    const oldListing = myListings.find(l => l.id === id);
    
    const { error } = await supabase
      .from('cattle_listings')
      .delete()
      .eq('id', id);

    if (error) throw error;
    
    // Log audit event for listing deletion
    await logEvent({
      action: 'DELETE',
      tableName: 'cattle_listings',
      recordId: id,
      oldData: oldListing as unknown as Record<string, unknown>,
    });
    
    await fetchMyListings();
  };

  // Subscribe to realtime updates
  useEffect(() => {
    fetchListings();
    
    const channel = supabase
      .channel('cattle_listings_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'cattle_listings'
        },
        () => {
          fetchListings();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  useEffect(() => {
    if (user) {
      fetchMyListings();
    }
  }, [user]);

  return {
    listings,
    myListings,
    loading,
    createListing,
    updateListing,
    deleteListing,
    getSellerContact,
    refetch: fetchListings
  };
};
