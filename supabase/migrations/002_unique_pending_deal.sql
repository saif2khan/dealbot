-- Only one scheduled deal per item at a time
CREATE UNIQUE INDEX idx_pending_deals_one_per_item
  ON public.pending_deals (item_id)
  WHERE status = 'scheduled';
