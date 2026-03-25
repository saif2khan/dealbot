import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import NewItemForm from './NewItemForm'

export default async function NewItemPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('users')
    .select('items_listed_this_month, items_limit')
    .eq('id', user.id)
    .single()

  if ((profile?.items_listed_this_month ?? 0) >= (profile?.items_limit ?? 10)) {
    redirect('/items')
  }

  return <NewItemForm />
}
