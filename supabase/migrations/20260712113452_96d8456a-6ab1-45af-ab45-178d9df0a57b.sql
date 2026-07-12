
-- Tighten INSERT policy with minimal input validation
DROP POLICY "Anyone can create a booking" ON public.bookings;
CREATE POLICY "Anyone can create a booking" ON public.bookings
  FOR INSERT TO anon, authenticated
  WITH CHECK (
    length(trim(customer_name)) > 0
    AND length(trim(customer_phone)) >= 6
    AND pickup_at > now() - interval '1 day'
  );

-- Restrict SECURITY DEFINER function execution
REVOKE EXECUTE ON FUNCTION public.has_role(UUID, public.app_role) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.handle_new_user_bootstrap() FROM PUBLIC, anon, authenticated;
