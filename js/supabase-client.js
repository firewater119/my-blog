import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// publishable(anon) 키는 공개되어도 안전 — 접근은 RLS로 제한됨
const SUPABASE_URL = 'https://drjdncphbjqlpeuazynd.supabase.co';
const SUPABASE_KEY = 'sb_publishable_7X1SbYQdMkRvzVBrg2Mshg__sv6NATB';

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
