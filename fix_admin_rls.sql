-- Fix: remove the self-referencing (recursive) policy on admins
DROP POLICY IF EXISTS "Admins can view admins table" ON admins;

-- Replace with a simple non-recursive policy:
-- a user may only see their OWN row in admins.
-- That's exactly what checkIfAdmin() needs (it queries user_id = the logged-in user).
CREATE POLICY "Users can view own admin row"
  ON admins
  FOR SELECT
  USING (auth.uid() = user_id);
