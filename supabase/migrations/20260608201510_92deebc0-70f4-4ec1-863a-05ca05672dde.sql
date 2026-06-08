
CREATE POLICY "Organizers view tickets of own events" ON public.tickets
FOR SELECT TO authenticated
USING (
  event_id IN (
    SELECT e.id FROM public.events e
    JOIN public.organizers o ON o.id = e.organizer_id
    WHERE o.user_id = auth.uid() AND o.approval_status = 'approved'
  )
);

CREATE POLICY "Organizers validate tickets of own events" ON public.tickets
FOR UPDATE TO authenticated
USING (
  event_id IN (
    SELECT e.id FROM public.events e
    JOIN public.organizers o ON o.id = e.organizer_id
    WHERE o.user_id = auth.uid() AND o.approval_status = 'approved'
  )
)
WITH CHECK (
  event_id IN (
    SELECT e.id FROM public.events e
    JOIN public.organizers o ON o.id = e.organizer_id
    WHERE o.user_id = auth.uid() AND o.approval_status = 'approved'
  )
);
