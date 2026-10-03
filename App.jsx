import {useEffect,useState,useCallback} from 'react'
import {toast} from 'sonner'
import {Package,Search,Plus,LogOut,Laptop,Monitor,Projector,Keyboard,Camera,Box} from 'lucide-react'
import {supabase} from './supabase'

const ST={available:['Available','bg-emerald-100 text-emerald-700'],borrowed:['Borrowed','bg-amber-100 text-amber-700'],maintenance:['Maintenance','bg-rose-100 text-rose-700']}
const ICONS={laptop:Laptop,monitor:Monitor,projector:Projector,keyboard:Keyboard,camera:Camera}
const inp='w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500'
const B=c=>`px-3 py-2 rounded-lg text-sm font-medium disabled:opacity-50 ${c}`
const Badge=({t,c})=><span className={`px-2 py-0.5 rounded-full text-xs font-medium ${c}`}>{t}</span>

function Auth(){
  const [tab,setTab]=useState('in'),[f,setF]=useState({email:'',password:'',name:''}),[busy,setBusy]=useState(false)
  const go=async()=>{setBusy(true)
    const r=tab==='in'?await supabase.auth.signInWithPassword({email:f.email,password:f.password})
      :await supabase.auth.signUp({email:f.email,password:f.password,options:{data:{full_name:f.name}}})
    setBusy(false)
    if(r.error)return toast.error(r.error.message)
    toast.success(tab==='in'?'Signed in':(r.data.session?'Account created':'Check your email to confirm'))}
  const s=k=>e=>setF({...f,[k]:e.target.value})
  return <div className="min-h-screen flex items-center justify-center p-4"><div className="bg-white rounded-2xl shadow p-6 w-full max-w-sm">
    <div className="flex items-center gap-2 text-2xl font-bold text-indigo-600"><Package/>AssetFlow</div><p className="text-sm text-slate-500 mb-4">Equipment Management</p>
    <div className="grid grid-cols-2 bg-slate-100 rounded-lg p-1 mb-4 text-sm">{[['in','Sign In'],['up','Sign Up']].map(([k,l])=><button key={k} onClick={()=>setTab(k)} className={`py-1.5 rounded-md ${tab===k?'bg-white shadow font-medium':''}`}>{l}</button>)}</div>
    <div className="space-y-3">{tab==='up'&&<input className={inp} placeholder="Full name" value={f.name} onChange={s('name')}/>}
      <input className={inp} placeholder="Email" type="email" value={f.email} onChange={s('email')}/>
      <input className={inp} placeholder="Password (min 6)" type="password" value={f.password} onChange={s('password')}/>
      <button disabled={busy} onClick={go} className={B('bg-indigo-600 text-white w-full hover:bg-indigo-700')}>{busy?'Please wait...':tab==='in'?'Sign In':'Create account'}</button></div></div></div>}

function Modal({children,onClose}){return <div className="fixed inset-0 bg-slate-900/60 flex items-center justify-center p-4 z-40" onClick={e=>e.target===e.currentTarget&&onClose()}><div className="bg-white rounded-xl p-5 w-full max-w-md">{children}</div></div>}

export default function App(){
  const [session,setSession]=useState(undefined),[profile,setProfile]=useState(null)
  const [page,setPage]=useState('inv'),[eqs,setEqs]=useState([]),[recs,setRecs]=useState([]),[active,setActive]=useState({})
  const [q,setQ]=useState(''),[fs,setFs]=useState('all'),[dlg,setDlg]=useState(null),[form,setForm]=useState({}),[viewAsUser,setViewAsUser]=useState(false)
  const isAdmin=profile?.role==='admin'&&!viewAsUser

  useEffect(()=>{supabase.auth.getSession().then(({data})=>setSession(data.session))
    const {data:{subscription}}=supabase.auth.onAuthStateChange((_e,s)=>setSession(s));return()=>subscription.unsubscribe()},[])

  const load=useCallback(async()=>{
    if(!session)return
    const {data:p}=await supabase.from('profiles').select('*').eq('id',session.user.id).single();setProfile(p)
    const {data:e,error}=await supabase.from('equipments').select('*').order('created_at');if(error)toast.error(error.message);setEqs(e||[])
    const {data:r}=await supabase.from('borrow_records').select('*,equipments(name,asset_code),profiles(email,full_name)').order('borrow_date',{ascending:false})
    setRecs(r||[]);setActive(Object.fromEntries((r||[]).filter(x=>x.status==='active').map(x=>[x.equipment_id,x])))
  },[session])
  useEffect(()=>{load()},[load])

  const run=async(promise,msg)=>{const {error}=await promise;if(error)return toast.error(error.message);toast.success(msg);setDlg(null);load()}
  const save=()=>{
    if(!form.name||!form.asset_code)return toast.error('Name and asset code are required')
    const row={name:form.name,asset_code:form.asset_code,category:form.category||null,image_url:form.image_url||null,notes:form.notes||null}
    run(form.id?supabase.from('equipments').update(row).eq('id',form.id):supabase.from('equipments').insert(row),form.id?'Equipment updated':'Equipment added')}
  const borrow=()=>run(supabase.rpc('borrow_equipment',{p_equipment_id:dlg.e.id,p_expected:form.expected||null,p_notes:form.notes||null}),'Borrowed successfully')
  const ret=()=>run(supabase.rpc('return_equipment',{p_equipment_id:dlg.e.id}),'Marked as returned')
  const del=()=>run(supabase.from('equipments').delete().eq('id',dlg.e.id),'Equipment deleted')
  const open=(t,e={},f={})=>{setForm(f);setDlg({t,e})}

  if(session===undefined)return <div className="p-8 text-slate-500">Loading...</div>
  if(!session)return <Auth/>
  const list=eqs.filter(e=>(fs==='all'||e.status===fs)&&`${e.name} ${e.asset_code} ${e.category}`.toLowerCase().includes(q.toLowerCase()))
  const hist=recs.filter(r=>isAdmin||r.user_id===session.user.id)
  const cancel=<button onClick={()=>setDlg(null)} className={B('border')}>Cancel</button>
  const nav=k=>`${B(page===k?'bg-indigo-50 text-indigo-700':'text-slate-600')}`

  return <div className="text-slate-800 min-h-screen">
    <header className="bg-white border-b sticky top-0 z-30"><div className="max-w-6xl mx-auto px-4 py-3 flex flex-wrap items-center gap-3">
      <div className="flex items-center gap-2 text-indigo-600 font-bold"><Package size={20}/>AssetFlow<span className="hidden md:inline text-xs font-normal text-slate-500">- Equipment Management</span></div>
      <nav className="flex gap-1 ml-2"><button className={nav('inv')} onClick={()=>setPage('inv')}>Inventory</button><button className={nav('hist')} onClick={()=>setPage('hist')}>{isAdmin?'Borrowing Records':'My Borrowed Items'}</button></nav>
      <div className="ml-auto flex items-center gap-2 text-sm"><span className="hidden sm:inline text-slate-500">{profile?.full_name||session.user.email}</span>
        <Badge t={isAdmin?'Admin':'User'} c={isAdmin?'bg-indigo-100 text-indigo-700':'bg-slate-100 text-slate-700'}/>
        {import.meta.env.DEV&&profile?.role==='admin'&&<button onClick={()=>setViewAsUser(!viewAsUser)} className={B('border border-dashed border-slate-400 text-slate-600')}>Dev: view as {viewAsUser?'Admin':'User'}</button>}
        <button onClick={()=>supabase.auth.signOut()} className={B('text-slate-600 hover:bg-slate-100')}><LogOut size={16}/></button></div></div></header>
    <main className="max-w-6xl mx-auto p-4">
    {page==='inv'?<>
      <div className="flex flex-wrap gap-2 mb-4"><div className="relative flex-1 sm:max-w-xs"><Search size={16} className="absolute left-3 top-2.5 text-slate-400"/><input className={inp+' pl-9'} placeholder="Search name, code, category" value={q} onChange={e=>setQ(e.target.value)}/></div>
        <select className={inp+' sm:max-w-[160px]'} value={fs} onChange={e=>setFs(e.target.value)}><option value="all">All</option>{Object.entries(ST).map(([k,v])=><option key={k} value={k}>{v[0]}</option>)}</select>
        {isAdmin&&<button onClick={()=>open('form',{}, {})} className={B('bg-indigo-600 text-white ml-auto hover:bg-indigo-700 flex items-center gap-1')}><Plus size={16}/>Add Equipment</button>}</div>
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">{list.map(e=>{const Ic=ICONS[(e.category||'').toLowerCase()]||Box,r=active[e.id]
        return <div key={e.id} className="bg-white rounded-xl border shadow-sm p-4 flex flex-col gap-3">
          <div className="flex justify-between items-start"><div className="h-14 w-14 rounded-lg bg-slate-100 flex items-center justify-center overflow-hidden">{e.image_url?<img src={e.image_url} alt="" className="h-full w-full object-cover"/>:<Ic className="text-slate-500"/>}</div>
            {isAdmin&&<div className="flex gap-1"><button onClick={()=>open('form',e,e)} className={B('text-slate-600 hover:bg-slate-100')}>Edit</button><button onClick={()=>open('del',e)} className={B('text-rose-600 hover:bg-rose-50')}>Delete</button></div>}</div>
          <div><div className="flex gap-1 mb-1"><Badge t={e.asset_code} c="bg-slate-100 text-slate-700"/>{e.category&&<Badge t={e.category} c="bg-indigo-50 text-indigo-700"/>}</div><div className="font-semibold">{e.name}</div>{e.notes&&<div className="text-xs text-slate-500">{e.notes}</div>}</div>
          <div className="flex items-center justify-between mt-auto"><Badge t={ST[e.status][0]} c={ST[e.status][1]}/>{e.status==='borrowed'&&r?.profiles&&<span className="text-xs text-slate-500 truncate ml-2">by {r.profiles.full_name||r.profiles.email}</span>}</div>
          {e.status==='available'&&<button onClick={()=>open('borrow',e)} className={B('bg-emerald-600 text-white hover:bg-emerald-700')}>Borrow</button>}
          {e.status==='borrowed'&&isAdmin&&<button onClick={()=>open('ret',e)} className={B('bg-amber-500 text-white hover:bg-amber-600')}>Return Equipment</button>}</div>})}
        {!list.length&&<p className="text-slate-500">No equipment found.</p>}</div></>
    :<div className="bg-white rounded-xl border overflow-x-auto"><table className="w-full text-sm"><thead className="bg-slate-50 text-left text-slate-500"><tr>{['Equipment','Asset Code','Borrower','Borrowed','Expected','Returned','Status'].map(h=><th key={h} className="p-3 font-medium">{h}</th>)}</tr></thead><tbody>
      {hist.map(r=><tr key={r.id} className="border-t"><td className="p-3">{r.equipments?.name}</td><td className="p-3">{r.equipments?.asset_code}</td><td className="p-3">{r.profiles?.full_name||r.profiles?.email||'-'}</td>
        <td className="p-3">{r.borrow_date?.slice(0,10)}</td><td className="p-3">{r.expected_return_date||'-'}</td><td className="p-3">{r.actual_return_date?.slice(0,10)||'-'}</td>
        <td className="p-3"><Badge t={r.status==='active'?'Active':'Returned'} c={r.status==='active'?'bg-amber-100 text-amber-700':'bg-emerald-100 text-emerald-700'}/></td></tr>)}
      {!hist.length&&<tr><td colSpan={7} className="p-6 text-center text-slate-500">No records.</td></tr>}</tbody></table></div>}
    </main>
    {dlg&&<Modal onClose={()=>setDlg(null)}>
      {dlg.t==='form'&&<><h3 className="font-semibold mb-3">{form.id?'Edit':'Add'} Equipment</h3><div className="space-y-2">
        {[['name','Equipment name'],['asset_code','Asset code'],['category','Category (Laptop, Monitor...)'],['image_url','Image URL']].map(([k,p])=><input key={k} className={inp} placeholder={p} value={form[k]||''} onChange={e=>setForm({...form,[k]:e.target.value})}/>)}
        <textarea className={inp} placeholder="Notes" value={form.notes||''} onChange={e=>setForm({...form,notes:e.target.value})}/></div>
        <div className="flex justify-end gap-2 mt-4">{cancel}<button onClick={save} className={B('bg-indigo-600 text-white')}>Save</button></div></>}
      {dlg.t==='borrow'&&<><h3 className="font-semibold">Borrow {dlg.e.name}</h3><p className="text-xs text-slate-500 mb-3">{dlg.e.asset_code} · {dlg.e.category}</p>
        <label className="text-xs text-slate-500">Expected return date</label><input type="date" className={inp+' mb-2'} onChange={e=>setForm({...form,expected:e.target.value})}/>
        <textarea className={inp} placeholder="Purpose / notes" onChange={e=>setForm({...form,notes:e.target.value})}/>
        <div className="flex justify-end gap-2 mt-4">{cancel}<button onClick={borrow} className={B('bg-emerald-600 text-white')}>Confirm</button></div></>}
      {dlg.t==='ret'&&<><h3 className="font-semibold mb-2">Return {dlg.e.name}?</h3><p className="text-sm text-slate-500">Mark as returned and make it available again.</p><div className="flex justify-end gap-2 mt-4">{cancel}<button onClick={ret} className={B('bg-amber-500 text-white')}>Mark Returned</button></div></>}
      {dlg.t==='del'&&<><h3 className="font-semibold mb-2">Delete {dlg.e.name}?</h3><p className="text-sm text-slate-500">Its borrowing records will be removed too.</p><div className="flex justify-end gap-2 mt-4">{cancel}<button onClick={del} className={B('bg-rose-600 text-white')}>Delete</button></div></>}
    </Modal>}</div>}
